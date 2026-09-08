// STOPGAP — see state.js header. Structure only, no styling polish, per spec.
export function buildLayout(root) {
  root.innerHTML = '';

  const left = document.createElement('div');
  left.id = 'panel-left';

  const middle = document.createElement('div');
  middle.id = 'panel-middle';

  const right = document.createElement('div');
  right.id = 'panel-right';

  root.style.display = 'flex';
  root.append(left, middle, right);

  return { left, middle, right };
}
