import type { CSSProperties, ReactNode } from "react";
import { solutionsTheme } from "./tokens";

type SlideProps = {
  children: ReactNode;
  background?: keyof typeof solutionsTheme.colors;
  foreground?: keyof typeof solutionsTheme.colors;
};

const baseSlideStyle: CSSProperties = {
  width: solutionsTheme.canvas.width,
  height: solutionsTheme.canvas.height,
  fontFamily: solutionsTheme.fonts.body,
  boxSizing: "border-box"
};

export function SolutionsSlide({
  children,
  background = "air",
  foreground = "onyx"
}: SlideProps) {
  return (
    <section
      style={{
        ...baseSlideStyle,
        background: solutionsTheme.colors[background],
        color: solutionsTheme.colors[foreground],
        padding: 96,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 40
      }}
    >
      {children}
    </section>
  );
}

export function TitleSlide({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <SolutionsSlide background="purple" foreground="air">
      <h1 style={{ fontSize: 112, lineHeight: 1, margin: 0 }}>{title}</h1>
      {subtitle ? <p style={{ fontSize: 38, margin: 0 }}>{subtitle}</p> : null}
    </SolutionsSlide>
  );
}

export function TwoColumnSlide({
  title,
  left,
  right
}: {
  title: string;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <SolutionsSlide>
      <h2 style={{ fontSize: 72, margin: 0 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </SolutionsSlide>
  );
}
