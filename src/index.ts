import size from "./size";
import format from "./format";
import micromatch from "micromatch";
import sharp from "sharp";
import Vinyl from "vinyl";
import rename from "rename";
import path from "path";
import * as fs from "fs/promises";
import mkdirp from "mkdirp";

let snowpackOutputDir = "";
let snowpackRootDir = "";
let snowpackMountDirs = {};

const wait = (delaySeconds) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(0), delaySeconds * 1000);
    });
};

export default function plugin(
    _: any,
    images: SnowpackPluginResizeImagesOptions
) {
    return {
        name: "snowpack-plugin-once-image-sharp",
        config(snowpackConfig) {
            snowpackOutputDir = snowpackConfig.buildOptions.out;
            snowpackRootDir = snowpackConfig.root;
            snowpackMountDirs = snowpackConfig.mount;
        },
        async transform({
            contents,
            id: filePath,
        }: {
            contents: any;
            id: string;
        }) {
            let base;
            const promisesToAwait = []
            for (const globPattern in images) {
                if (micromatch.isMatch(filePath, globPattern)) {
                    let toFormat;
                    let relativePath;

                    const mountDirs = Object.keys(snowpackMountDirs);

                    const foundDir = mountDirs.filter((dir: string) => {
                        return filePath.match(dir);
                    });
                    if (foundDir.length) {
                        relativePath = filePath
                            .replace(foundDir[0], "")
                            .replace(path.basename(filePath), "");
                    }
                    base = base || sharp(Buffer.from(contents, "binary"));

                    const metadata = await base.metadata();
                    const ext = path.extname(path.basename(filePath));
                    const basename = path.basename(filePath).replace(ext, "");
                    const imagesToGenerate = images[globPattern];
                    for (const methods of imagesToGenerate) {
                        const formatOptions: any =
                            (methods as any)["formatOptions"] || {};
                        let copyFilePath = filePath;
                        let newBasename = basename;

                        if (methods["resize"]) {
                            (methods["resize"] as any).width = size(
                                (methods["resize"] as any).width,
                                metadata.width
                            );
                            (methods["resize"] as any).height = size(
                                (methods["resize"] as any).height,
                                metadata.height
                            );
                        }
                        if (methods["rename"]) {
                            copyFilePath = copyFilePath.replace(
                                basename,
                                rename(basename, methods["rename"])
                            );
                            newBasename = rename(basename, methods["rename"]);
                        }

                        if (methods["format"]) {
                            toFormat = methods["format"];
                        } else {
                            toFormat = format(copyFilePath);
                        }

                        delete (methods as any)["formatOptions"];
                        delete (methods as any)["format"];
                        delete (methods as any)["rename"];

                        const clone = convertImage(
                            base,
                            toFormat,
                            formatOptions
                        );

                        for (const method in methods) {
                            const methodOptions = methods[method];

                            if (Array.isArray(methodOptions)) {
                                // @ts-ignore
                                clone[method](...methodOptions);
                            } else {
                                // @ts-ignore
                                clone[method](methodOptions);
                            }
                        }
                        const buffer = await clone.toBuffer();
                        const newFile = new Vinyl({
                            cwd: "/",
                            base: newBasename,
                            path: copyFilePath,
                            contents: buffer,
                        });

                        newFile.extname = "." + toFormat;
                        const writeFile = async (path, newFile) => {
                            await mkdirp(path);
                            return fs.writeFile(
                                path + newFile.base + newFile.extname,
                                newFile.contents
                            );
                        };
                        promisesToAwait.push(
                            writeFile(snowpackOutputDir + relativePath, newFile)
                        );
                    };
                    await Promise.all(promisesToAwait);
                    return {
                        result: await base.toBuffer(),
                    };
                }
            }
        },
    };
}

function convertImage(image, format, config) {
    const clone = image.clone();

    switch (format) {
        case "jpeg":
        case "jpg":
        case "jpe":
            return clone.jpeg(config);
        case "png":
        case "webp":
        case "tiff":
        default:
            return clone.toFormat(format, config);
    }
}

export type SnowpackPluginResizeImagesOptions = {
    [globPattern: string]: [
        {
            [sharpMethod: string]:
                | {
                      [sharpMethodOption: string]: any;
                  }
                | any[];
        }
    ];
};
