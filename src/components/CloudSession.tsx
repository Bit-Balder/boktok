import type { AccountController } from '../hooks/useAccount';
import { useCloudLibrary } from '../hooks/useCloudLibrary';
import { Workspace } from '../App';
export default function CloudSession({
  account,
  reload,
}: {
  account: AccountController;
  reload: () => void;
}) {
  const library = useCloudLibrary(account.user!.uid);
  return <Workspace account={account} library={library} reload={reload} />;
}
