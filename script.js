document.getElementById("process").addEventListener("click", async () => {
  const fileInput = document.getElementById("upload");
  const modelName = document.getElementById("model").value;

  if (!fileInput.files.length) {
    alert("Please upload an image first.");
    return;
  }

  const img = new Image();
  img.src = URL.createObjectURL(fileInput.files[0]);

  img.onload = async () => {
    let model;

    if (modelName === "realesrgan") {
      model = await realesrgan.load(); // ✅ Correct object name
    } else {
      model = await waifu2x.load();
    }

    const result = await model.upscale(img);

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = result.width;
    canvas.height = result.height;
    ctx.putImageData(result, 0, 0);

    const downloadLink = document.getElementById("download");
    downloadLink.href = canvas.toDataURL("image/png");
  };
});
