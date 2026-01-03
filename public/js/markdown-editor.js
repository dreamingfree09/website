/**
 * public/js/markdown-editor.js
 *
 * Markdown editor + live preview.
 *
 * Used to provide a richer authoring experience for content entry.
 */
class MarkdownEditor {
  constructor(textareaId, previewId) {
    this.textarea = document.getElementById(textareaId);
    this.preview = document.getElementById(previewId);
    this.toolbar = null;
    
    if (!this.textarea) {
      console.error('Textarea not found:', textareaId);
      return;
    }
    
    this.init();
  }

  init() {
    this.createToolbar();
    this.attachEventListeners();
    
    // Initialize with any existing content
    if (this.textarea.value) {
      this.updatePreview();
    }
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'markdown-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="md-btn" data-action="bold" title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button type="button" class="md-btn" data-action="italic" title="Italic (Ctrl+I)">
        <em>I</em>
      </button>
      <button type="button" class="md-btn" data-action="heading" title="Heading">
        H
      </button>
      <button type="button" class="md-btn" data-action="link" title="Link (Ctrl+K)">
        🔗
      </button>
      <button type="button" class="md-btn" data-action="code" title="Code">
        &lt;/&gt;
      </button>
      <button type="button" class="md-btn" data-action="quote" title="Quote">
        ""
      </button>
      <button type="button" class="md-btn" data-action="list" title="Bulleted List">
        •••
      </button>
      <button type="button" class="md-btn" data-action="numbered" title="Numbered List">
        1.2.3
      </button>
      <button type="button" class="md-btn md-preview-toggle" data-action="preview" title="Toggle Preview">
        👁
      </button>
    `;

    this.textarea.parentNode.insertBefore(toolbar, this.textarea);
    this.toolbar = toolbar;

    // Add event listeners to toolbar buttons
    toolbar.querySelectorAll('.md-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        this.executeAction(action);
      });
    });
  }

  attachEventListeners() {
    // Update preview on input
    this.textarea.addEventListener('input', () => {
      this.updatePreview();
    });

    // Keyboard shortcuts
    this.textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            this.executeAction('bold');
            break;
          case 'i':
            e.preventDefault();
            this.executeAction('italic');
            break;
          case 'k':
            e.preventDefault();
            this.executeAction('link');
            break;
        }
      }

      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertAtCursor('  ');
      }
    });
  }

  executeAction(action) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    const beforeText = this.textarea.value.substring(0, start);
    const afterText = this.textarea.value.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch(action) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'heading':
        newText = `## ${selectedText || 'Heading'}`;
        cursorOffset = newText.length;
        break;
      case 'link':
        const url = selectedText.match(/^https?:\/\//) ? selectedText : 'https://';
        newText = `[${selectedText || 'link text'}](${url})`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'code':
        if (selectedText.includes('\n')) {
          newText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
        } else {
          newText = `\`${selectedText || 'code'}\``;
        }
        cursorOffset = newText.length - 3;
        break;
      case 'quote':
        newText = `> ${selectedText || 'quote'}`;
        cursorOffset = newText.length;
        break;
      case 'list':
        newText = `- ${selectedText || 'list item'}`;
        cursorOffset = newText.length;
        break;
      case 'numbered':
        newText = `1. ${selectedText || 'list item'}`;
        cursorOffset = newText.length;
        break;
      case 'preview':
        this.togglePreview();
        return;
      default:
        return;
    }

    this.textarea.value = beforeText + newText + afterText;
    this.textarea.selectionStart = start + cursorOffset;
    this.textarea.selectionEnd = start + cursorOffset;
    this.textarea.focus();
    this.updatePreview();
  }

  insertAtCursor(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const beforeText = this.textarea.value.substring(0, start);
    const afterText = this.textarea.value.substring(end);

    this.textarea.value = beforeText + text + afterText;
    this.textarea.selectionStart = start + text.length;
    this.textarea.selectionEnd = start + text.length;
    this.updatePreview();
  }

  togglePreview() {
    if (!this.preview) return;
    
    const isHidden = this.preview.style.display === 'none';
    this.preview.style.display = isHidden ? 'block' : 'none';
    
    // Update button state
    const previewBtn = this.toolbar.querySelector('[data-action="preview"]');
    if (previewBtn) {
      previewBtn.classList.toggle('active', isHidden);
    }
  }

  updatePreview() {
    if (!this.preview) return;

    const markdown = this.textarea.value;
    const html = this.parseMarkdown(markdown);
    this.preview.innerHTML = html;

    // Syntax highlighting for code blocks
    this.preview.querySelectorAll('pre code').forEach(block => {
      this.highlightCode(block);
    });
  }

  parseMarkdown(markdown) {
    // Simple markdown parser (for production, use marked.js)
    let html = markdown;

    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

    return html;
  }
  highlightCode(block) {
    // Simple syntax highlighting (for production, use highlight.js)
    const code = block.textContent;
    const lang = block.className.replace('language-', '');

    let highlighted = code;

    if (lang === 'javascript' || lang === 'js') {
      highlighted = highlighted
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|new)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="literal">$1</span>')
        .replace(/"([^"]*)"/g, '"<span class="string">$1</span>"')
        .replace(/'([^']*)'/g, '\'<span class="string">$1</span>\'')
        .replace(/\/\/(.+)$/gm, '<span class="comment">//$1</span>');
    } else if (lang === 'python') {
      highlighted = highlighted
        .replace(/\b(def|class|if|else|elif|for|while|return|import|from|as|try|except)\b/g, '<span class="keyword">$1</span>')
        .replace(/\b(True|False|None)\b/g, '<span class="literal">$1</span>')
        .replace(/"([^"]*)"/g, '"<span class="string">$1</span>"')
        .replace(/'([^']*)'/g, '\'<span class="string">$1</span>\'')
        .replace(/#(.+)$/gm, '<span class="comment">#$1</span>');
    }

    block.innerHTML = highlighted;
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(value) {
    this.textarea.value = value;
    this.updatePreview();
  }
}

// Allow non-editor usage (e.g., rendering post content in the forum detail pane)
// without requiring a textarea/preview DOM pairing.
MarkdownEditor.parse = function (markdown) {
  const text = String(markdown ?? '');
  // Reuse the instance parser logic without needing to construct the full editor.
  // Create a minimal object with the method bound.
  return MarkdownEditor.prototype.parseMarkdown.call({}, text);
};

// Auto-initialize markdown editors
document.addEventListener('DOMContentLoaded', () => {
  // Initialize markdown editor if elements exist
  const contentTextarea = document.getElementById('postContent');
  const previewDiv = document.getElementById('markdownPreview');
  
  if (contentTextarea && previewDiv) {
    window.markdownEditor = new MarkdownEditor('postContent', 'markdownPreview');
  }
});
