// script.js — new frontend logic (replace your DOMContentLoaded block)
document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generateBtn');
  const userInput = document.getElementById('userInput');
  const optionsContainer = document.getElementById('options-container');

  // Utility: simple string hash to namespace saved checklists
  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return 'rdm_' + Math.abs(h);
  }

  // Parse Markdown (limited): headings and task lists (- [ ] or - [x])
  function parseMarkdownToTree(md) {
    const lines = md.split('\n');
    const root = { type: 'root', children: [] };
    const stack = [root];

    lines.forEach(rawLine => {
      const line = rawLine.replace(/\r$/, '');
      if (/^#{1,3}\s+/.test(line)) {
        // heading
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#{1,3}\s+/, '').trim();
        stack[0].children.push({ type: 'heading', level, text });
        return;
      }

      // task list item: "- [ ] ..." or "- [x] ..."
      const taskMatch = line.match(/^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/);
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        const content = taskMatch[2].trim();

        // determine nesting level by leading spaces (2 or 4)
        const leadingSpaces = line.match(/^\s*/)[0].length;
        const depth = Math.floor(leadingSpaces / 2); // 0 = top-level

        // We'll represent items with depth; collect under root in order
        stack[0].children.push({ type: 'task', depth, checked, content });
        return;
      }

      // plain bullet or paragraph
      if (/^\s*[-*]\s+/.test(line)) {
        const text = line.replace(/^\s*[-*]\s+/, '').trim();
        stack[0].children.push({ type: 'bullet', text });
        return;
      }

      if (line.trim() === '') {
        // skip
        return;
      }

      // fallback: paragraph
      stack[0].children.push({ type: 'para', text: line.trim() });
    });

    return root;
  }

  // Render the parsed tree into DOM with nested lists and checkboxes
  function renderTree(root, container, storageKey) {
    container.innerHTML = ''; // clear

    const elems = root.children;
    const ulStack = [createUL(container)]; // an array of ULs keyed by depth

    elems.forEach(node => {
      if (node.type === 'heading') {
        const h = document.createElement(node.level === 1 ? 'h2' : 'h3');
        h.innerText = node.text;
        h.className = 'text-white font-bold';
        container.appendChild(h);
      } else if (node.type === 'para') {
        const p = document.createElement('p');
        p.innerText = node.text;
        p.className = 'text-gray-200 text-sm mb-2';
        container.appendChild(p);
      } else if (node.type === 'bullet') {
        const li = document.createElement('li');
        li.innerText = node.text;
        li.className = 'text-gray-200';
        ulStack[ulStack.length - 1].appendChild(li);
      } else if (node.type === 'task') {
        // ensure ul for depth
        while (ulStack.length <= node.depth) {
          const newUL = createUL(container);
          // append to last list item in previous ul
          const prevUL = ulStack[ulStack.length - 1];
          const lastLI = prevUL.lastElementChild;
          if (lastLI) {
            lastLI.appendChild(newUL);
          } else {
            // fallback: append to container
            container.appendChild(newUL);
          }
          ulStack.push(newUL);
        }
        // collapse deeper uls if moving up
        ulStack.length = node.depth + 1;

        const li = document.createElement('li');
        li.className = 'text-gray-100 mb-1';
        const id = storageKey + '::' + sanitizeKey(node.content);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = loadCheckboxState(id, node.checked);
        checkbox.className = 'mr-2';

        const label = document.createElement('label');
        label.appendChild(document.createTextNode(node.content));
        label.className = 'select-none';

        // persist on change
        checkbox.addEventListener('change', () => {
          saveCheckboxState(id, checkbox.checked);
        });

        li.appendChild(checkbox);
        li.appendChild(label);
        ulStack[ulStack.length - 1].appendChild(li);
      }
    });

    // helper functions
    function createUL(parent) {
      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.className = 'ml-4';
      parent.appendChild(ul);
      return ul;
    }

    function sanitizeKey(s) {
      return s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 60);
    }
  }

  // localStorage helpers
  function saveCheckboxState(key, checked) {
    try {
      localStorage.setItem(key, checked ? '1' : '0');
    } catch (e) {
      console.warn('Could not save checklist state', e);
    }
  }

  function loadCheckboxState(key, defaultChecked) {
    try {
      const v = localStorage.getItem(key);
      if (v === null || v === undefined) return defaultChecked || false;
      return v === '1';
    } catch (e) {
      return defaultChecked || false;
    }
  }

  // Main click handler
  generateBtn.addEventListener('click', async () => {
    const prompt = userInput.value.trim();
    if (!prompt) {
      alert('Please enter a topic!');
      return;
    }

    optionsContainer.innerHTML = '<p class="placeholder-text text-white">Generating roadmap…</p>';
    generateBtn.disabled = true;

    try {
      const resp = await fetch('http://localhost:3000/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      const md = data.post; // expected to be Markdown per the new system prompt

      // parse and render
      const tree = parseMarkdownToTree(md);

      // namespace storage by hash of prompt so different prompts have different checklists
      const storageKey = hashCode(prompt);

      // render interactive tree
      renderTree(tree, optionsContainer, storageKey);

      // optional: show raw markdown in console for debugging
      console.log('Generated Markdown:', md);

    } catch (err) {
      console.error(err);
      optionsContainer.innerHTML = '<p class="placeholder-text text-red-300">Failed to generate roadmap. See console for details.</p>';
    } finally {
      generateBtn.disabled = false;
    }
  });
});
