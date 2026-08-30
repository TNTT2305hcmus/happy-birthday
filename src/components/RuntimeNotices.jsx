export function RuntimeNotices() {
  return (
    <div className="runtime-notices" aria-live="polite">
      <p className="runtime-notice webgl-notice">
        Thiết bị không hỗ trợ WebGL2. Phiên bản 2D nhẹ đang được sử dụng.
      </p>
      <p className="runtime-notice lite-notice">
        Lite Mode đang bật để giữ trải nghiệm mượt mà.
      </p>
    </div>
  )
}
