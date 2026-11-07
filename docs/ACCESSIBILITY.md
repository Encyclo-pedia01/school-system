# Accessibility notes

- The current application contains no HTML `<img>` or Next.js `<Image>` elements. Interface visuals use text and Lucide SVG icons; the app favicon includes a title. Any future content image needs meaningful alternative text, while purely decorative imagery should use an empty alternative.
- App routes use native `header`, `nav`, `main`, `section`, `article`, `footer`, `form`, and `table` elements where appropriate. Tables have captions and scoped column headers.
- Form labels and inline errors are associated with their controls. Loading and error feedback uses status/alert semantics.
- The mobile navigation exposes dialog semantics, returns focus to its trigger, supports Escape, and keeps Tab navigation inside the open drawer.
