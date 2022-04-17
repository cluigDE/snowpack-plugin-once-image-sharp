# @oncede/snowpack-plugin-once-image-sharp
> This library is in development and should not be used in production.<br>
> For now I try to implement some kind of feedback and control over the generation of images.<br><br> Stay tuned for new Updates. <br><br> If you have any suggestions, don't hesitate to open an issue.

## Experimental Plugin
Still fighting with the capabilities of snowpack. If anyone knows how to passdown custom cli attributes to this plugin, let me know.
<br>It only runs on the build process. In Dev work with the full image fallback.

[![NPM Version][npm-image]][npm-url]
[![Downloads Stats][npm-downloads]][npm-url]

This snowpack plugin allows you to use the sharp image library with percentages for width and height.

![](header.png)

## Installation


```sh
npm i -D @oncede/snowpack-plugin-once-image-sharp@latest sharp@latest
```

## Run example


```sh
git clone @oncede/snowpack-plugin-once-image-sharp . && npm i && npm run example
```

## Usage
> <b>options.forceRebuild</b> only takes effect if <b>buildOption.clean</b> is set to <b>false</b> <br>
> buildOption.clean clears the whole dist folder <br><br>
> By default previously generated images would be skipped. (checked with fs.access by path )
<p>
<br>
</p>

***
<p>
<br>
Simply add the following code to your snowpack.config.json (encapsulated by { } )
</p>


```json
"plugins": [
        [
            "@oncede/snowpack-plugin-once-image-sharp",
            {
                "options": {
                    "silent": true,
                    "forceRebuild": false,
                    "defaultFormat": "webp",
                    "jsonOutput": "lazysizes.json"
                },
                "imageConfig": {
                    "**/*.jpg": [
                        {
                            "resize": {
                                "width": "1%"
                            },
                            "rename": { "suffix": "-init" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            },
                            "blur": true
                        },
                        {
                            "resize": {
                                "width": "5%"
                            },
                            "rename": { "suffix": "-5%" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            }
                        },
                        {
                            "resize": {
                                "width": "20%"
                            },
                            "rename": { "suffix": "-20%" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            }
                        },
                        {
                            "resize": {
                                "width": "40%"
                            },
                            "rename": { "suffix": "-40%" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            }
                        },
                        {
                            "resize": {
                                "width": "60%"
                            },
                            "rename": { "suffix": "-60%" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            }
                        },
                        {
                            "resize": {
                                "width": "80%"
                            },
                            "rename": { "suffix": "-80%" },
                            "format": "webp",
                            "formatOptions": {
                                "quality": 80
                            }
                        },
                    ]
                }
            }
        ]
    ]
```
<p>
lazySizes.json Output<br>
It might be easier to dynamically build the lazysizes images with this JSON

This JSON will only build on `snowpack build`
</p>

```json
{
    "/assets/img/": {
        "dariusz-sankowski-dvK_CT1Wg78-unsplash": {
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-init.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-5%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-10%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-20%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-30%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-40%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-50%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-60%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-70%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-80%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            },
            "dariusz-sankowski-dvK_CT1Wg78-unsplash-90%.webp": {
                "format": "jpeg",
                "size": 1069192,
                "width": 4608,
                "height": 3456
            }
        }
    }
}
```


## Release History
* 0.3.0
    * added a jsonOutput to simplify the dynamic usage
* 0.2.3
    * switched from transform() to load()
    * added a defaultFormat option for the source image
* 0.2.1
    * Running only on build process w/o Errors
* 0.1.0
    * First working example
* 0.0.3
    * init

## Meta

Christoph Luig – [@email](mailto:c.luig.0nce@gmail.com) – [www.0nce.de](https://www.0nce.de)

Distributed under the MIT license. See ``LICENSE`` for more information.

[cluigDE](https://github.com/cluigDE)

## Inspired by

[mahnunchik](https://github.com/mahnunchik/gulp-responsive/)

[jaredLunde](https://github.com/jaredLunde/snowpack-plugin-resize-images)

Both wrote amazing plugins, which helped me to create this library.


## Contributing

1. Fork it (<https://github.com/yourname/yourproject/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

<!-- Markdown link & img dfn's -->
[npm-image]: https://img.shields.io/npm/v/@oncede/snowpack-plugin-once-image-sharp.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@oncede/snowpack-plugin-once-image-sharp
[npm-downloads]: https://img.shields.io/npm/dm/@oncede/snowpack-plugin-once-image-sharp.svg?style=flat-square
