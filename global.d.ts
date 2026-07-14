// Allow CSS side-effect imports in TypeScript (Next.js App Router pattern)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
