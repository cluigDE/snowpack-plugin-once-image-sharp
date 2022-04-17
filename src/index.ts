import size from "./size";
import format from "./format";
import micromatch from "micromatch";
import sharp from "sharp";
import Vinyl from "vinyl";
import rename from "rename";
import path from "path";
import fs from "fs";
import mkdirp from "mkdirp";
import chalk from "chalk";

let snowpackOutputDir = "";
let snowpackRootDir = "";
let snowpackMountDirs = {};
let buildOptionsClean = true;
let silent = true;
let jsonOutput = null;

export default function plugin(_: any, images: SnowpackPluginOptions) {
    return {
        name: "snowpack-plugin-once-image-sharp",
        config(snowpackConfig) {
            snowpackOutputDir = snowpackConfig.buildOptions.out;
            snowpackRootDir = snowpackConfig.root;
            snowpackMountDirs = snowpackConfig.mount;
            buildOptionsClean = snowpackConfig.buildOptions.clean;
            if (typeof images.options === "undefined") {
                images.options = {
                    silent: true,
                    forceRebuild: false,
                    jsonOutput: null,
                    defaultFormat: ".webp",
                };
            }

            if (typeof images.options.silent === "boolean") {
                silent = images.options.silent;
            } else {
                images.options.silent = true;
            }
            if (
                typeof images.options.forceRebuild === "boolean" &&
                images.options.forceRebuild === true
            ) {
                console.log(`${chalk.bgRed("forceRebuild enabled")}`);
            } else {
                images.options.forceRebuild = false;
            }
            if (
                typeof images.options.jsonOutput === "string" &&
                images.options.jsonOutput !== null
            ) {
                jsonOutput = snowpackRootDir + images.options.jsonOutput;
            } else {
                images.options.jsonOutput = null;
            }
            if (
                typeof images.options.defaultFormat === "string" &&
                images.options.defaultFormat !== null
            ) {
                images.options.defaultFormat =
                    images.options.defaultFormat.indexOf(".") === -1
                        ? "." + images.options.defaultFormat
                        : images.options.defaultFormat;
            } else {
                images.options.defaultFormat = ".webp";
            }
        },
        resolve: {
            input: Object.keys(images.imageConfig).map((v) =>
                v.replace("**/*", "")
            ) || [".jpg", ".png", ".jpeg", ".svg", ".webp"],
            output: [
                images.options.defaultFormat.indexOf(".") === -1
                    ? "." + images.options.defaultFormat
                    : images.options.defaultFormat,
            ],
        },
        async load(file) {
            let base;
            const filePath = file.filePath;
            const promisesToAwait = [];
            for (const globPattern in images.imageConfig) {
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
                    const contents = await fs.promises.readFile(
                        filePath,
                        "binary"
                    );
                    base = base || sharp(Buffer.from(contents, "binary"));

                    const metadata = await base.metadata();
                    const ext = path.extname(path.basename(filePath));
                    const basename = path.basename(filePath).replace(ext, "");
                    log(`${chalk.bgBlue(basename + ext)} - Base Found`);
                    let formatOptionsParent = {};
                    let toFormatParent = ext;
                    for (const methods of images.imageConfig[globPattern]) {
                        const formatOptions: any =
                            (methods as any)["formatOptions"] || {};
                        formatOptionsParent = formatOptions;
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
                            toFormatParent = toFormat;
                        } else {
                            toFormat = images.options.defaultFormat.replace(
                                ".",
                                ""
                            );
                        }

                        const pathToBe =
                            snowpackOutputDir +
                            relativePath +
                            newBasename +
                            "." +
                            toFormat;

                        if (
                            false === buildOptionsClean &&
                            false === images.options.forceRebuild &&
                            (await checkFileExists(pathToBe))
                        ) {
                            log(
                                `   ${chalk.bgCyanBright(
                                    newBasename + "." + toFormat
                                )} - SKIP`
                            );
                            continue;
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
                            return fs.promises
                                .writeFile(
                                    path + newFile.base + newFile.extname,
                                    newFile.contents
                                )
                                .then(() => {
                                    log(
                                        `   ${chalk.bgBlueBright(
                                            newBasename + "." + toFormat
                                        )} - Generated`
                                    );
                                });
                        };
                        promisesToAwait.push(
                            writeFile(snowpackOutputDir + relativePath, newFile)
                        );
                    }
                    await Promise.all(promisesToAwait);
                    /* base = convertImage(
                        base,
                        images.options.defaultFormat,
                        formatOptionsParent
                    ); */
                    //base.extname = "." + images.options.defaultFormat;

                    /* if (    !(false === buildOptionsClean &&
                            false === images.options.forceRebuild &&
                            (await checkFileExists(
                        snowpackOutputDir +
                            relativePath +
                            basename +
                            base.extname)))
                        ) {
                            await fs.promises
                                .writeFile(
                                    snowpackOutputDir +
                                        relativePath +
                                        basename +
                                        base.extname,
                                    await base.toBuffer()
                                )
                                .then(() => {
                                    log(
                                        `   ${chalk.bgBlueBright(
                                            basename + "." + toFormat
                                        )} - Generated`
                                    );
                                });
                        } else {
                            log(
                                `   ${chalk.bgCyanBright(
                                    basename + "." + toFormat
                                )} - SKIP`
                            );
                        } */

                    return {
                        [images.options.defaultFormat]: await base.toBuffer(),
                    };
                }
            }
        },
    };
}

function log(msg:string) {
    if(silent === false) console.log(msg);
}

function checkFileExists(filepath){
  return new Promise((resolve, reject) => {
    fs.access(filepath, fs.constants.F_OK, error => {
      resolve(!error);
    });
  });
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
    ]
};
interface SnowpackPluginOptions {
    options: {
        forceRebuild: boolean;
        silent: boolean;
        jsonOutput: string;
        defaultFormat: string;
    };
    imageConfig: SnowpackPluginResizeImagesOptions;
};