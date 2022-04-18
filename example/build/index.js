import "./_snowpack/pkg/lazysizes.js";
import "./_snowpack/pkg/lazysizes/plugins/parent-fit/ls.parent-fit.js";
async function getJSON(url = "") {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    redirect: "follow",
    referrerPolicy: "no-referrer"
  });
  return response.json();
}
const folder = "/assets/img/";
const imageName = "dariusz-sankowski-dvK_CT1Wg78-unsplash";
document.addEventListener("lazybeforeunveil", async function(e) {
  const image = e.target;
  const imageName2 = image.getAttribute("data-file");
  const image_sizes = await getJSON("/image_sizes.json");
  let srcSet = Object.keys(image_sizes[folder][imageName2]).map((file) => {
    const conf = image_sizes[folder][imageName2][file];
    return `${folder + file} ${conf.width}w,`;
  }).join(" \n");
  image.setAttribute("data-srcset", srcSet);
});
