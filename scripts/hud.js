Sidebar.addEventListener("mouseenter", () => {
    Sidebar.setAttribute("Active", "");
    document.querySelector(".Chat").setAttribute("Active", "");
    ProfilePopup.style.left = `calc(${ProfilePopup.getBoundingClientRect().left}px + 15em + 4px - 3em - 2px)`;
});
Sidebar.addEventListener("mouseleave", () => {
    Sidebar.removeAttribute("Active");
    document.querySelector(".Chat").removeAttribute("Active");
    ProfilePopup.style.left = `calc(${ProfilePopup.getBoundingClientRect().left}px + 3em + 2px - 15em - 4px)`;
});