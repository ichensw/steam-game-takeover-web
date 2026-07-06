import { Flex, Typography } from 'antd';

type Props = {
  title: string;
  description: string;
  extra?: React.ReactNode;
};

export default function PageHeader({ title, description, extra }: Props) {
  return (
    <Flex align="center" justify="space-between" gap={24} className="page-header">
      <div>
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      {extra}
    </Flex>
  );
}

