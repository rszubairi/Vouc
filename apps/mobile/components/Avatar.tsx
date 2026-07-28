import { useEffect, useState } from "react";
import { View, Text, StyleProp, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  imageStyle: StyleProp<ImageStyle>;
  placeholderStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
};

// Some legacy profile photos point at URLs that fail to load on-device (e.g.
// blocked by iOS App Transport Security, or since removed) — falling back to
// the initials placeholder on load failure keeps the avatar from silently
// rendering blank instead of just never attempting the fallback at all.
export function Avatar({ uri, name, imageStyle, placeholderStyle, textStyle }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return <Image source={{ uri }} style={imageStyle} onError={() => setFailed(true)} />;
  }

  return (
    <View style={placeholderStyle}>
      <Text style={textStyle}>{name?.[0]?.toUpperCase() ?? "?"}</Text>
    </View>
  );
}
