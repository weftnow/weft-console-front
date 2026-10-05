import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";
import styles from "./auth-shell.module.css";

// Shared by every step of the embedded sign-in and sign-up flows.
export const authAppearance = {
  variables: {
    colorPrimary: "#171816",
    colorForeground: "#171816",
    colorMutedForeground: "#72736f",
    colorBackground: "#f8f7f4",
    colorInput: "#ffffff",
    colorInputForeground: "#171816",
    colorBorder: "rgba(87, 78, 67, 0.11)",
    colorRing: "rgba(255, 90, 31, 0.19)",
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    fontSize: "14px",
    borderRadius: "11px",
  },
  elements: {
    rootBox: styles.clerkRoot,
    cardBox: styles.clerkCardBox,
    card: styles.clerkCard,
    headerTitle: styles.clerkTitle,
    headerSubtitle: styles.clerkSubtitle,
    formFieldInput: styles.clerkInput,
    socialButtonsBlockButton: styles.clerkSocialButton,
    formButtonPrimary: styles.clerkPrimary,
    footer: styles.clerkFooter,
    footerActionLink: styles.clerkFooterLink,
  },
} satisfies NonNullable<ComponentProps<typeof SignIn>["appearance"]>;
