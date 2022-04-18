import "lazysizes";
// import a plugin
import "lazysizes/plugins/parent-fit/ls.parent-fit";

async function getJSON(url = "") {
    // Default options are marked with *
    const response = await fetch(url, {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

const folder = "/assets/img/";
const imageName = "dariusz-sankowski-dvK_CT1Wg78-unsplash";

document.addEventListener("lazybeforeunveil", async function (e: any) {
    const image: HTMLImageElement = e.target;
    const imageName = image.getAttribute('data-file');
    const image_sizes = await getJSON("/image_sizes.json");
    let srcSet = (Object.keys(image_sizes[folder][imageName]) as any)
        .map((file) => {
            const conf = image_sizes[folder][imageName][file];
            return `${folder + file} ${conf.width}w,`;
        })
        .join(" \n");
    image.setAttribute('data-srcset', srcSet);
});
