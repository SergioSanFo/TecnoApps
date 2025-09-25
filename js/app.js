document.addEventListener("DOMContentLoaded", () => {
  const btnImagen = document.getElementById("btn-imagen");
  const inputImagen = document.getElementById("imagen");
  const previewBox = document.getElementById("preview-box");

  btnImagen.addEventListener("click", () => {
    inputImagen.click();
  });

  inputImagen.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewBox.innerHTML = `<img src="${e.target.result}" alt="Imagen seleccionada">`;
      };
      reader.readAsDataURL(file);
    }
  });
});
