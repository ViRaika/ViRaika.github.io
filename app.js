// ============================================
//  PAGE NAVIGATION
// ============================================
document.addEventListener('DOMContentLoaded', function () {

  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  const pages    = document.querySelectorAll('.page');
  const navBtns  = document.querySelectorAll('[data-navigate]');

  function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    const link = document.querySelector('.nav-link[data-page="' + pageId + '"]');
    if (link) link.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showPage(this.dataset.page);
    });
  });

  navBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      showPage(this.dataset.navigate);
    });
  });
});
