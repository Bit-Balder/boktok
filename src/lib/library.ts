import type { Book, BookInput } from './books';
import type { BookChange } from './bookChanges';
import type { SaveResult } from './firebase/cloud';
import type { CloudLibrary } from '../hooks/useCloudLibrary';
export interface LibraryController {
  books: Book[];
  error: string;
  blocked: boolean;
  loading: boolean;
  pending: boolean;
  save: (
    input: BookInput,
    id?: string,
    allowDuplicate?: boolean,
  ) => SaveResult | Promise<SaveResult>;
  update: (id: string, change: BookChange) => boolean | Promise<boolean>;
  remove: (id: string) => boolean | Promise<boolean>;
  imports: CloudLibrary['imports'] | null;
}
