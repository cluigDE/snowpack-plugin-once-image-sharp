import size from "./size";
import micromatch from "micromatch";
import sharp from "sharp";
import Vinyl from "vinyl";
import rename from "rename";
import path from "path";
import fs from "fs";
import mkdirp from "mkdirp";
import chalk from "chalk";
import glob from "glob";
import { PluginLoadOptions, SnowpackConfig } from "snowpack";

let options: Options;
const jsonObj = {};

const defaultOptions: Options = {
    silent: true,
    forceRebuild: false,
    jsonOutput: "image_sizes.json",
    generateImagesOnDev: false,
    defaultFormat: "webp",
};

export default function plugin(
    _: SnowpackConfig,
    pluginOptions: SnowpackPluginOptions
) {
   //  _.exclude = [..._.exclude, ...Object.keys(pluginOptions.imageConfig)];

    options = { ...defaultOptions, ...pluginOptions.options };

    // make defaultFormat start with a dot
    options.defaultFormat.indexOf(".") === -1
        ? "." + options.defaultFormat
        : options.defaultFormat;

    async function generateImages(filePath, globPattern) {
        let base;
        const promisesToAwait = [];
        let toFormat: any = "";
        let relativePath = "";
        const foundDir = Object.keys(_.mount).filter((dir: string) => {
            return filePath.match(dir);
        });
        if (foundDir.length) {
            relativePath = filePath
                .replace(foundDir[0], "")
                .replace(path.basename(filePath), "");
        }
        const contents = await fs.promises.readFile(filePath, "binary");
        base = base || sharp(Buffer.from(contents, "binary"));

        const metadata = await base.metadata();
        const ext = path.extname(path.basename(filePath));
        const basename = path.basename(filePath).replace(ext, "");
        log(`${chalk.bgBlue(basename + ext)} - Base Found`);
        let formatOptionsParent = {};
        let toFormatParent = ext;
        for (const methods of pluginOptions.imageConfig[globPattern]) {
            const formatOptions: any = (methods as any)["formatOptions"] || {};
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
                toFormat = options.defaultFormat.replace(".", "");
            }

            const pathToBe =
                _.buildOptions.out + relativePath + newBasename + "." + toFormat;
            if (
                false === _.buildOptions.clean &&
                false === options.forceRebuild &&
                (await checkFileExists(pathToBe))
            ) {
                log(
                    `   ${chalk.bgCyanBright(
                        newBasename + "." + toFormat
                    )} - SKIP`
                );
                continue;
            }

            const clone = convertImage(base, toFormat, formatOptions);

            if (_.mode === "development" && !options.generateImagesOnDev) {
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

            const filteredMethods = { ...methods };

            delete (filteredMethods as any)["formatOptions"];
            delete (filteredMethods as any)["format"];
            delete (filteredMethods as any)["rename"];

            for (const method in filteredMethods) {
                const methodOptions = filteredMethods[method];

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
                writeFile(_.buildOptions.out + relativePath, newFile)
            );
        }
        return promisesToAwait;
    }

    if (_.mode === "development") {
        let imagePaths: imagePaths = {};

        for (const folder in _.mount) {
            if (Object.prototype.hasOwnProperty.call(_.mount, folder)) {
                const mountOptions = _.mount[folder];
                if (mountOptions.static) continue;

                Object.keys(pluginOptions.imageConfig).forEach(
                    (globPattern: string) => {
                        if (
                            !Object.prototype.hasOwnProperty.call(
                                imagePaths,
                                globPattern
                            )
                        ) {
                            imagePaths[globPattern] = glob.sync(
                                folder + "/" + globPattern
                            );
                        }
                        imagePaths[globPattern] = [
                            ...imagePaths[globPattern],
                            ...glob.sync(folder + "/" + globPattern),
                        ].filter(onlyUnique);
                    }
                );
            }
        }

        const promisesToAwait = [];
        for (const globPattern in imagePaths) {
            for (const filePath of imagePaths[globPattern]) {
                promisesToAwait.push(generateImages(filePath, globPattern));
            }
        }
        Promise.all(promisesToAwait.flat());

        if (options.jsonOutput !== null) {
            fs.promises.writeFile(
                options.jsonOutput,
                JSON.stringify(jsonObj)
            );
        }
    }

    return {
        name: "snowpack-plugin-once-image-sharp",
        async load(plo: PluginLoadOptions) {
            const filePath = plo.filePath;
            let base;
            const contents = await fs.promises.readFile(filePath, "binary");
            base = base || sharp(Buffer.from(contents, "binary"));
            const promisesToAwait = [];
            for (const globPattern in pluginOptions.imageConfig) {
                promisesToAwait.push(generateImages(filePath, globPattern));
            }
            await Promise.all(promisesToAwait.flat());

            if (options.jsonOutput !== null) {
                await fs.promises.writeFile(
                    options.jsonOutput,
                    JSON.stringify(jsonObj)
                );
            }
            return {
                ["." + options.defaultFormat]: await base.toBuffer(),
            };
        },
        resolve: {
            input: Object.keys(pluginOptions.imageConfig).map((v) =>
                v.replace("**/*", "")
            ) || [".jpg", ".png", ".jpeg", ".svg", ".webp"],
            output: ["." + options.defaultFormat],
        },
    };
}

function log(msg: any) {
    if (options.silent === false) console.log(msg);
}

function checkFileExists(filepath) {
    return new Promise((resolve, reject) => {
        fs.access(filepath, fs.constants.F_OK, (error) => {
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

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

async function writeIntoJonObj(
    relativePath: string,
    basename: string,
    newFile: any,
    info: any
) {
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
    ];
};

export type imagePaths = {
    [globPattern: string]: string[];
};

interface SnowpackPluginOptions {
    options: Options;
    imageConfig: SnowpackPluginResizeImagesOptions;
}

interface Options {
    generateImagesOnDev: boolean;
    forceRebuild: boolean;
    silent: boolean;
    jsonOutput: string;
    defaultFormat: string;
}
