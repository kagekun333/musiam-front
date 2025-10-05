import React from "react";
import styles from "@/styles/oracle.module.css";

type Props = {
  back: React.ReactNode;
  front: React.ReactNode;
  flipped: boolean;
  onClick?: () => void;
  className?: string;
};

export default function FlipCard({ back, front, flipped, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={flipped}
      className={`${styles.oracleFlip} ${className ?? ""}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <div
        className={styles.oracleFlipInner}
        style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
      >
        <div className={`${styles.oracleFlipFace} ${styles.oracleFlipBack}`}>{back}</div>
        <div className={`${styles.oracleFlipFace} ${styles.oracleFlipFront}`}>{front}</div>
      </div>
    </button>
  );
}

