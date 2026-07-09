import { Select } from 'antd';
import type { SelectProps } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { listKookMembers } from '../api/admin';

type MemberRow = {
  id?: React.Key;
  kookUserId?: React.Key;
  username?: string;
  nickname?: string;
  identifyNum?: string;
};

type Props = {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  mode?: SelectProps['mode'];
  placeholder?: string;
  style?: CSSProperties;
};

function memberValue(row: MemberRow) {
  return String(row.kookUserId || row.id || '');
}

function memberLabel(row: MemberRow) {
  const name = row.nickname || row.username || '未命名用户';
  const code = row.identifyNum ? `#${row.identifyNum}` : '';
  return `${name}${code} (${memberValue(row)})`;
}

export default function KookMemberSelect({ value, onChange, mode, placeholder, style }: Props) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const search = async (keyword = '') => {
    setLoading(true);
    try {
      const res = await listKookMembers({ page: 1, pageSize: 20, keyword, isBlacklisted: false });
      setOptions(
        ((res.list || res.items || []) as MemberRow[])
          .map((row) => ({ value: memberValue(row), label: memberLabel(row) }))
          .filter((option) => option.value),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    return () => window.clearTimeout(timer.current);
  }, []);

  return (
    <Select
      allowClear
      filterOption={false}
      loading={loading}
      mode={mode}
      onChange={onChange}
      onSearch={(keyword) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => search(keyword), 300);
      }}
      optionFilterProp="label"
      options={options}
      placeholder={placeholder || '搜索昵称 / 用户名 / KOOK ID'}
      showSearch
      style={style}
      value={value}
    />
  );
}
