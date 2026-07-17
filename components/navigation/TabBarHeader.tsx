import React from 'react';
import { Appbar, AppbarProps } from 'react-native-paper';

type HeaderOptions = {
  title?: string;
  headerLeft?: (props: Record<string, never>) => React.ReactNode;
  headerRight?: (props: { canGoBack: boolean }) => React.ReactNode;
};

type TabsHeaderNavProps = {
  options: HeaderOptions;
  route: {
    name: string;
  };
};

interface TabsHeaderProps extends AppbarProps {
  navProps: TabsHeaderNavProps;
}

const TabsHeader = (props: TabsHeaderProps) => (
  <Appbar.Header {...props}>
    {props.navProps.options.headerLeft ? props.navProps.options.headerLeft({}) : undefined}

    <Appbar.Content title={props.navProps.options.title ?? props.navProps.route.name} />

    {props.navProps.options.headerRight
      ? props.navProps.options.headerRight({
          canGoBack: false,
        })
      : undefined}
  </Appbar.Header>
);

export default TabsHeader;
