// Runs inline in <head>, before the first paint: restores the reader's theme and motion
// choices so the page never flashes the wrong one. No choice stored means no attribute,
// and the system setting decides.
;(function () {
  try {
    var root = document.documentElement
    var theme = localStorage.getItem("strm-theme")
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme)
    var motion = localStorage.getItem("strm-motion")
    if (motion === "reduced" || motion === "full") root.setAttribute("data-motion", motion)
  } catch (e) {}
})()
