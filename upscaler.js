let model;

async function loadModel() {
    document.getElementById("upscaleBtn").innerText = "Loading Model...";
    // Yaha apne model ka local path do
    model = await tf.loadGraphModel('./model/model.json');
    document.getElementById("upscaleBtn").innerText = "Upscale Image";
}

document.getElementById("fileInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        document.getElementById("originalImg").src = event.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("upscaleBtn").addEventListener("click", async function () {
    if (!model) {
        await loadModel();
    }
    const img = document.getElementById("originalImg");
    if (!img.src) {
        alert("Please select an image first.");
        return;
    }

    const tensor = tf.browser.fromPixels(img).toFloat().div(255).expandDims(0);
    const output = model.execute(tensor);
    const upscaled = output.squeeze();
    await tf.browser.toPixels(upscaled, document.getElementById("upscaledCanvas"));
    tensor.dispose();
    output.dispose();
    upscaled.dispose();
});
