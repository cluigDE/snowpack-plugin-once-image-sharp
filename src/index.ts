import size from "./size";
import micromatch from "micromatch";
import sharp from "sharp";
import Vinyl from "vinyl";
import rename from "rename";
import path from "path";
import fs from "fs";
import mkdirp from "mkdirp";
import chalk from "chalk";
import {PluginLoadOptions} from 'snowpack'

let snowpackOutputDir = "";
let snowpackRootDir = "";
let snowpackMountDirs = {};
let options: Options;
let buildOptionsClean = true;
const jsonObj = {};


const defaultOptions: Options = {
    silent: true,
    forceRebuild: false,
    jsonOutput: "image_sizes.json",
    generateImagesOnDev: false,
    defaultFormat: "webp",
};

export default function plugin(_: any, images: SnowpackPluginOptions) {
    return {
        name: "snowpack-plugin-once-image-sharp",
        config(snowpackConfig) {
            snowpackOutputDir = snowpackConfig.buildOptions.out;
            snowpackRootDir = snowpackConfig.root;
            snowpackMountDirs = snowpackConfig.mount;
            buildOptionsClean = snowpackConfig.buildOptions.clean;

            options = { ...defaultOptions, ...images.options};
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
        async load(plo: PluginLoadOptions) {
            let base;
            const filePath = plo.filePath;
            const promisesToAwait = [];
            for (const globPattern in images.imageConfig) {
                if (micromatch.isMatch(filePath, globPattern)) {
                    let toFormat: any = "";
                    let relativePath = "";

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



                        if (plo.isDev && !options.generateImagesOnDev) {
                            const cloneReplacement = {
                                format: toFormat,
                                size: -1,
                                width: (methods["resize"] as any).width,
                                height: getCalculatedHeight(
                                    metadata,
                                    (methods["resize"] as any).width
                                ),
                            };
                            writeIntoJonObj(
                                relativePath,
                                basename,
                                {
                                    base: newBasename,
                                    extname: "." + toFormat,
                                },
                                cloneReplacement
                            );

                            continue;
                        }

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
                        const { data, info } = await clone.toBuffer({
                            resolveWithObject: true,
                        });
                        const buffer = data;
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
                                .then((e) => {
                                    writeIntoJonObj(relativePath, basename, newFile, info);
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

                    if (options.jsonOutput !== null) {
                        await fs.promises.writeFile(
                            options.jsonOutput,
                            JSON.stringify(jsonObj),
                        );
                    }

                    return {
                        [images.options.defaultFormat.indexOf(".") === -1
                            ? "." + images.options.defaultFormat
                            : images.options.defaultFormat]:
                            await base.toBuffer(),
                    };
                }
            }
        },
    };
}

function log(msg:string) {
    if(options.silent === false) console.log(msg);
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

function getCalculatedHeight(metadata, targetWidth) {
    const nHeight = metadata.height;
    const nWidth = metadata.width;
    const ratio = targetWidth / nWidth;
    return Math.abs(Math.round(nHeight * ratio));
}

async function writeIntoJonObj(relativePath: string, basename: string, newFile: any, info: any) {
    if (!Object.prototype.hasOwnProperty.call(jsonObj, relativePath)) {
        jsonObj[relativePath] = {};
    }
    if (
        !Object.prototype.hasOwnProperty.call(jsonObj[relativePath], basename)
    ) {
        jsonObj[relativePath][basename] = {};
    }
    let meta: any = info;

    jsonObj[relativePath][basename][newFile.base + newFile.extname] = {
        format: meta.format,
        size: meta.size,
        width: meta.width,
        height: meta.height,
    };
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
    options: Options;
    imageConfig: SnowpackPluginResizeImagesOptions;
};

interface Options {
        generateImagesOnDev: boolean;
        forceRebuild: boolean;
        silent: boolean;
        jsonOutput: string;
        defaultFormat: string;
    }