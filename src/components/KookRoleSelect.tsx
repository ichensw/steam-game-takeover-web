import { Select } from 'antd';
import type { SelectProps } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { listKookRoles } from '../api/admin';

type RoleRow = Record<string, unknown> & {
  role_id?: React.Key;
  roleId?: React.Key;
  name?: string;
};

type Props = {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  mode?: SelectProps['mode'];
  style?: CSSProperties;
};

function roleId(row: RoleRow) {
  return String(row.role_id || row.roleId || row.id || '');
}

function roleItems(data: Record<string, unknown>) {
  return ((data.items || data.list || []) as RoleRow[]).map((row) => ({ ...row, id: roleId(row) }));
}

export default function KookRoleSelect({ value, onChange, mode, style }: Props) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const search = async (keyword = '') => {
    setLoading(true);
    try {
      const rows = roleItems(await listKookRoles({ page: 1, pageSize: 100 }));
      const text = keyword.trim().toLowerCase();
      setOptions(
        rows
          .filter((row) => !text || String(row.name || '').toLowerCase().includes(text) || roleId(row).includes(text))
          .map((row) => ({ value: roleId(row), label: `${row.name || '未命名角色'} (${roleId(row)})` }))
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
      placeholder="搜索角色名称 / 角色 ID"
      showSearch
      style={style}
      value={value}
    />
  );
}
