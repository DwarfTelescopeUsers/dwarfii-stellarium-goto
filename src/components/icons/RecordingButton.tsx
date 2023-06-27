import styles from "@/components/icons/RecordButton.module.css";

type PropType = {
  onClick: () => void;
};
export default function RecordingButton(props: PropType) {
  const { onClick } = props;

  return (
    <svg
      onClick={onClick}
      className={styles.icon}
      height="100%"
      version="1.1"
      viewBox="0 0 64 64"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className={styles.outerring}>
        <path
          d="M2 32C2 15.4317 15.4317 2 32 2C48.5683 2 62 15.4317 62 32C62 48.5683 48.5683 62 32 62C15.4317 62 2 48.5683 2 32Z"
          fill="none"
          opacity="1"
          stroke="currentColor"
          strokeLinecap="butt"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M32 8.99178L28.5405 3L35.4595 3L32 8.99178Z"
          fill="currentColor"
          fillRule="nonzero"
          opacity="1"
          stroke="currentColor"
          strokeLinecap="butt"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </g>

      <path
        d="M21 21L43 21L43 43L21 43L21 21Z"
        fill="currentColor"
        fillRule="nonzero"
        opacity="1"
        stroke="currentColor"
        strokeLinecap="butt"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
