export interface ToolOptions {
  toolsets?: string[];
  tools?: string[];
}

export const TOOL_GROUPS: Record<string, string> = {
  vietqr_build: 'vietqr',
  vietqr_parse: 'vietqr',
  vietqr_decode: 'vietqr',
  vietqr_banks: 'vietqr',
  vn_address_parse: 'vn-address',
  vn_address_convert_batch: 'vn-address',
  vn_address_convert: 'vn-address',
  vn_address_search_wards: 'vn-address',
  vn_address_provinces: 'vn-address',
  vn_address_history: 'vn-address',
  vn_address_province: 'vn-address',
  vn_tax_id_validate_batch: 'vn-tax-id',
  vn_tax_id_validate: 'vn-tax-id',
  vn_tax_id_check_digit: 'vn-tax-id',
  vn_id_parse_batch: 'vn-id',
  vn_id_parse: 'vn-id',
  vn_phone_parse_batch: 'vn-phone',
  vn_phone: 'vn-phone',
  vn_name: 'vn-name',
  vn_money_to_words: 'vn-money-words',
  vn_text_speech_normalize: 'vn-money-words',
  vn_money_parse: 'vn-money-words',
  vn_number_format: 'vn-number-format',
  vn_lunar_from_solar: 'vn-lunar',
  vn_lunar_to_solar: 'vn-lunar',
  vn_lunar_parse_date: 'vn-lunar',
  vn_lunar_month: 'vn-lunar',
  vn_lunar_holidays: 'vn-lunar',
  vn_lunar_tet: 'vn-lunar',
  vn_lunar_canchi: 'vn-lunar',
  vn_lunar_ics: 'vn-lunar',
  vn_holidays_year: 'vn-holidays',
  vn_holidays_ics: 'vn-holidays',
  vn_holidays_is_working_day: 'vn-holidays',
  vn_holidays_add_working_days: 'vn-holidays',
  vn_holidays_count_working_days: 'vn-holidays',
  vn_einvoice_validate: 'vn-einvoice',
  vn_einvoice_totals: 'vn-einvoice',
  vn_einvoice_vat: 'vn-einvoice',
  vn_einvoice_mock_issue: 'vn-einvoice',
  vn_einvoice_example: 'vn-einvoice',
};

export const TOOLSET_NAMES = [...new Set(Object.values(TOOL_GROUPS))];

export interface ToolFilter {
  toolEnabled(name: string): boolean;
  /** True when the group is selected or any of its tools is enabled one by one. */
  groupEnabled(group: string): boolean;
}

export function validateToolOptions(options: ToolOptions = {}): void {
  const badSets = (options.toolsets ?? []).filter((s) => s !== 'all' && !TOOLSET_NAMES.includes(s));
  if (badSets.length > 0) {
    throw new Error(
      `Unknown toolset(s): ${badSets.join(', ')}. Valid toolsets: all, ${TOOLSET_NAMES.join(', ')}`,
    );
  }
  const badTools = (options.tools ?? []).filter((t) => !(t in TOOL_GROUPS));
  if (badTools.length > 0) {
    throw new Error(
      `Unknown tool(s): ${badTools.join(', ')}. Valid tools: ${Object.keys(TOOL_GROUPS).join(', ')}`,
    );
  }
}

export function createToolFilter(options: ToolOptions = {}): ToolFilter {
  validateToolOptions(options);
  const toolsets = options.toolsets ?? [];
  const tools = options.tools ?? [];
  if (toolsets.length === 0 && tools.length === 0) {
    return { toolEnabled: () => true, groupEnabled: () => true };
  }
  const all = toolsets.includes('all');
  const toolEnabled = (name: string) =>
    all || tools.includes(name) || toolsets.includes(TOOL_GROUPS[name] ?? '');
  return {
    toolEnabled,
    groupEnabled: (group) =>
      all || toolsets.includes(group) || tools.some((t) => TOOL_GROUPS[t] === group),
  };
}
