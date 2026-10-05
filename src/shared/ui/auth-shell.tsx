import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

export function AuthShell({ children, title, description }: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <Image src="/weft-mark.svg" alt="Weft" width={72} height={72} priority />
            <span>Weft Console</span>
          </div>
          {title && <h1 className={styles.title}>{title}</h1>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
        <div className={styles.form}>{children}</div>
      </div>
    </main>
  );
}
