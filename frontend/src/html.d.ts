// Tells TypeScript that importing a .html file gives you a string
declare module '*.html' {
  const content: string;
  export default content;
}
