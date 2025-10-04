// Tab switching
document.querySelectorAll(".tab-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const tabName = trigger.dataset.tab

    document.querySelectorAll(".tab-trigger").forEach((t) => t.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

    trigger.classList.add("active")
    document.getElementById(`${tabName}-tab`).classList.add("active")
  })
})

