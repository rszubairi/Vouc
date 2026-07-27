import Image from "next/image";
import { StoreBadges } from "../../../../components/StoreBadges";

type SharedComment = {
  _id: string;
  comment: string;
  commentDate: number;
  commenterNickName: string;
  commenterProfileImageUrl: string | null;
};

type SharedItem = {
  type: string;
  id: string;
  title: string;
  body: string;
  excerpt: string;
  imageUrl: string | null;
  authorName: string;
  postDate: number;
  comments: SharedComment[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export function ShareView({ item }: { item: SharedItem }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-[#FBF6E9] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#F2650C]/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#F5EFE0] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-xl space-y-6">
        <div className="bg-[#F5EFE0] border border-black/10 rounded-xl shadow-xl overflow-hidden">
          {item.imageUrl && (
            <div className="relative w-full aspect-[1200/630] bg-black/5">
              <Image
                src={item.imageUrl}
                alt={item.title || "Shared post image"}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}
          <div className="p-6">
            {item.title && (
              <h1 className="text-2xl font-bold text-black mb-1">{item.title}</h1>
            )}
            <p className="text-xs text-gray-500 mb-4">
              {item.authorName ? `${item.authorName} · ` : ""}
              {dateFormatter.format(item.postDate)}
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.body}</p>
          </div>
        </div>

        {item.comments.length > 0 && (
          <div className="bg-[#F5EFE0] border border-black/10 rounded-xl shadow-xl p-6">
            <h2 className="text-sm font-semibold text-black mb-4">
              Comments ({item.comments.length})
            </h2>
            <ul className="space-y-4">
              {item.comments.map((c) => (
                <li key={c._id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-black/10 shrink-0 overflow-hidden">
                    {c.commenterProfileImageUrl && (
                      <Image
                        src={c.commenterProfileImageUrl}
                        alt={c.commenterNickName}
                        width={32}
                        height={32}
                        unoptimized
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-black">
                      {c.commenterNickName || "Vouch member"}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-[#F5EFE0] border border-black/10 rounded-xl shadow-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Continue the conversation in the Vouch app.
          </p>
          <div className="flex justify-center">
            <StoreBadges />
          </div>
        </div>
      </div>
    </div>
  );
}
