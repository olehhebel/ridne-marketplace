const search = document.querySelector('#market-search');
if (search) {
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    document.querySelector('#catalog')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
