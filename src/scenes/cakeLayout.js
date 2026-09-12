// Fit the complete cake (platter through topper) to its DOM stage using the shared camera.
// Padding includes the idle bob, candle flicker and scroll rotation.
export function fitCakeToStage({ width, height, rect, camera }) {
  const stacked = width < 900
  const stage = rect ?? (stacked
    ? { left: 16, top: 80, width: width - 32, height: 240 }
    : { left: width * 0.04, top: height * 0.16, width: width * 0.46, height: height * 0.68 })
  const depth = camera?.position.z ?? 5
  const fov = camera?.fov ?? 45
  const worldPerPixel = 2 * Math.tan(fov * Math.PI / 360) * depth / Math.max(1, height)
  const scale = Math.max(0.01, Math.min(stage.width / 4.1, stage.height / 4.1) * worldPerPixel)
  return {
    scale,
    position: [
      (stage.left + stage.width / 2 - width / 2) * worldPerPixel,
      (height / 2 - stage.top - stage.height / 2) * worldPerPixel - 0.6 * scale,
      0,
    ],
  }
}
