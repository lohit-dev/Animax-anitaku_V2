import React from 'react';
import { Text } from 'react-native';

export const getFormattedTitle = (title: string) => {
  const words = title.split(/(\s+|\W)/).filter(Boolean);
  return words.map((word, index) => {
    if (word.match(/[a-zA-Z]/)) {
      const firstLetter = word.charAt(0);
      const restOfWord = word.slice(1);

      return (
        <React.Fragment key={index}>
          <Text className="text-3xl font-bold text-lime-300">{firstLetter}</Text>
          {restOfWord}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={index}>
        <Text className="text-white">{word}</Text>
      </React.Fragment>
    );
  });
};
