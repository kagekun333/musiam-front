// ルートは /gates へ転送
import { GetServerSideProps } from "next";
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: "/gates", permanent: false },
});
export default function Index() { return null; }
