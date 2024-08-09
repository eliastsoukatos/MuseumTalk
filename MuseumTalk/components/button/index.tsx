import { StyleSheet, ViewStyle, Text, TouchableOpacity } from "react-native";

interface IButton {
  title: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  onPressIn?: () => void;
  styles?: ViewStyle;
}
const Button = ({ onPress = () => {}, title, styles: _styles = {}, onLongPress, onPressOut, onPressIn }: IButton) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.button, _styles]}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#D1E9F6",
    width: "30%",
    height: "auto",
    justifyContent: "center",
    borderRadius: 10,
  },
  text: {
    textAlign: "center",
  },
});
