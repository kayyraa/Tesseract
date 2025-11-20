Sidebar.addEventListener("mouseenter", () => {
    Sidebar.setAttribute("Active", "");
    document.querySelector(".Chat").setAttribute("Active", "");
});
Sidebar.addEventListener("mouseleave", () => {
    Sidebar.removeAttribute("Active");
    document.querySelector(".Chat").removeAttribute("Active");
});