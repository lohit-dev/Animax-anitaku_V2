import { StyleSheet, Text, View } from 'react-native';

type RowItemProps = {
  name: string;
};
const RowItem = ({ name }: RowItemProps) => {
  return (
    <View>
      <Text>{name}</Text>
    </View>
  );
};
export default RowItem;

const styles = StyleSheet.create({});
