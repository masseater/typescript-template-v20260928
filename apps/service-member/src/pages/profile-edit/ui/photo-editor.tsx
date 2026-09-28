import { photoSlots } from "@repo/config";
import { useQueryClient } from "@tanstack/react-query";

import { profileOptions } from "#entities/profile/index.ts";
import { PhotoSlotEditor } from "./photo-slot-editor.tsx";

import type { Profile } from "#entities/profile/index.ts";
import type { ReactElement } from "react";
function PhotoEditor({
  profile,
}: Readonly<{
  profile: Profile;
}>): ReactElement {
  const queryClient = useQueryClient();
  function refresh(): Promise<void> {
    return queryClient.invalidateQueries({ queryKey: profileOptions.queryKey });
  }
  return (
    <div className="flex flex-col gap-6">
      {photoSlots.map((slot) => (
        <PhotoSlotEditor
          key={slot}
          memberId={profile.id}
          name={profile.name}
          onChanged={refresh}
          slot={slot}
          version={profile.photos[slot]}
        />
      ))}
    </div>
  );
}
export { PhotoEditor };
