import { POST as completeService } from '@/app/api/services/[id]/complete/route';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, context: RouteContext) {
  return completeService(request, context);
}
