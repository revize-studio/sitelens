// Following a link inside the menu should close it.
const menu = document.getElementById('menu');
menu?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) menu.hidePopover();
});
