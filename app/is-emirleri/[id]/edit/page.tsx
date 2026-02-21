import { permanentRedirect } from 'next/navigation';

type EditPageParams = {
  params: {
    id: string;
  };
};

export default function EditIsEmriPage({ params }: EditPageParams) {
  permanentRedirect(`/is-emirleri/${params.id}`);
}
