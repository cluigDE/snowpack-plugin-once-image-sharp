
import size from './size';
import micromatch from "micromatch";
import sharp from "sharp";

export default function plugin(_: any, images: SnowpackPluginResizeImagesOptions) {
    return {
        name: "snowpack-plugin-once-image-sharp",
        async transform({
            contents,
            id: filePath,
        }: {
            contents: any;
            id: string;
        }) {
            let base;

            for (const globPattern in images) {
                if (micromatch.isMatch(filePath, globPattern)) {
                    base = base || sharp(Buffer.from(contents, "binary"));
                    const metadata = await base.metadata();
                    const methods = images[globPattern];

                    for (const method in methods) {
                        const methodOptions = methods[method];
                        if(method === 'resize') {
                            (methodOptions as any).width = size(
                                (methodOptions as any).width,
                                metadata.width
                            );
                            (methodOptions as any).height = size(
                                (methodOptions as any).height,
                                metadata.height
                            );
                        }

                        if (Array.isArray(methodOptions)) {
                            // @ts-ignore
                            base[method](...methodOptions);
                        } else {
                            // @ts-ignore
                            base[method](methodOptions);
                        }
                    }
                }
            }

            if (base) {
                return {
                    result: await base.toBuffer(),
                };
            }
        },
    };
}


export type SnowpackPluginResizeImagesOptions = {
    [globPattern: string]: {
        [sharpMethod: string]:
            | {
                  [sharpMethodOption: string]: any;
              }
            | any[];
    };
};