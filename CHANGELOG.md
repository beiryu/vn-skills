# Changelog

## [0.8.0](https://github.com/beiryu/vn-skills/compare/v0.7.0...v0.8.0) (2026-10-30)


### Features

* **cli:** read structured columns in address convert-file --csv ([#261](https://github.com/beiryu/vn-skills/issues/261)) ([1bbd76f](https://github.com/beiryu/vn-skills/commit/1bbd76fc418ff4858fa77eb7294c313fcab8bacf)), closes [#254](https://github.com/beiryu/vn-skills/issues/254)
* **core:** export Standard Schema validators from @vn-skills/core/schema ([#296](https://github.com/beiryu/vn-skills/issues/296)) ([e12ed7f](https://github.com/beiryu/vn-skills/commit/e12ed7fc8abb5948dac319a4498976bd89fa13f4)), closes [#295](https://github.com/beiryu/vn-skills/issues/295)
* **mcp:** add Cloudflare Workers example and @vn-skills/mcp/server export ([#300](https://github.com/beiryu/vn-skills/issues/300)) ([688e79c](https://github.com/beiryu/vn-skills/commit/688e79cba7ecdcf093583bb49dbd1c0074eab697)), closes [#298](https://github.com/beiryu/vn-skills/issues/298)
* **mcp:** add opt-in Streamable HTTP mode (--http) ([#244](https://github.com/beiryu/vn-skills/issues/244)) ([0af8d1a](https://github.com/beiryu/vn-skills/commit/0af8d1a1cf2e5dceaf065888a67c76b0704180c0)), closes [#243](https://github.com/beiryu/vn-skills/issues/243)
* **mcp:** add prompts for the main vn-skills tasks ([#252](https://github.com/beiryu/vn-skills/issues/252)) ([f54bc7c](https://github.com/beiryu/vn-skills/commit/f54bc7c2b62d42dc0de71e00f3b6a901f41f71a3)), closes [#250](https://github.com/beiryu/vn-skills/issues/250)
* **mcp:** add read-only, offline annotations to every tool ([#245](https://github.com/beiryu/vn-skills/issues/245)) ([e604bf1](https://github.com/beiryu/vn-skills/commit/e604bf150405833f4cd26b55feb458194173494b)), closes [#242](https://github.com/beiryu/vn-skills/issues/242)
* **mcp:** ask user to pick a ward in vn_address_convert ([#266](https://github.com/beiryu/vn-skills/issues/266)) ([f91390a](https://github.com/beiryu/vn-skills/commit/f91390a6a797b34f89fde4959fae960192249104)), closes [#265](https://github.com/beiryu/vn-skills/issues/265)
* **mcp:** expose provinces, banks, wards and holidays as resources ([#259](https://github.com/beiryu/vn-skills/issues/259)) ([186ea32](https://github.com/beiryu/vn-skills/commit/186ea32875318ed261c4fad55db287a67670e777)), closes [#257](https://github.com/beiryu/vn-skills/issues/257)
* **mcp:** show inline VietQR card for vietqr_build in MCP Apps ([#269](https://github.com/beiryu/vn-skills/issues/269)) ([12d4bfd](https://github.com/beiryu/vn-skills/commit/12d4bfdcbf05a5a3095f999276979bb8c73ca30f)), closes [#268](https://github.com/beiryu/vn-skills/issues/268)
* **skill:** add Excel custom-functions add-in package ([#287](https://github.com/beiryu/vn-skills/issues/287)) ([356ff4b](https://github.com/beiryu/vn-skills/commit/356ff4bc9994f800567a96adc391391b3a6de3e1)), closes [#284](https://github.com/beiryu/vn-skills/issues/284)
* **skill:** add Google Sheets custom-functions bundle ([#274](https://github.com/beiryu/vn-skills/issues/274)) ([7653b24](https://github.com/beiryu/vn-skills/commit/7653b242aed57daba394ee1e284bab7f5bcad1ab)), closes [#272](https://github.com/beiryu/vn-skills/issues/272)
* **skill:** add SDT, TACH_TEN and CCCD to the Excel add-in ([#292](https://github.com/beiryu/vn-skills/issues/292)) ([c9d550e](https://github.com/beiryu/vn-skills/commit/c9d550efe642cae956c0e8095321548c7cbf66bd)), closes [#290](https://github.com/beiryu/vn-skills/issues/290)
* **skill:** add VN_SDT, VN_TACH_TEN and VN_CCCD to Sheets ([#286](https://github.com/beiryu/vn-skills/issues/286)) ([efba2d0](https://github.com/beiryu/vn-skills/commit/efba2d07c09c4d1503efd54945d5aeb4af47cafd)), closes [#285](https://github.com/beiryu/vn-skills/issues/285)
* **vietqr:** add runtime bank registry and --banks option ([#276](https://github.com/beiryu/vn-skills/issues/276)) ([5de41e2](https://github.com/beiryu/vn-skills/commit/5de41e28ec8f16d9c9c9bb48851bde25c0686f54)), closes [#270](https://github.com/beiryu/vn-skills/issues/270)
* **vietqr:** find banks by SWIFT/BIC code ([#267](https://github.com/beiryu/vn-skills/issues/267)) ([b150170](https://github.com/beiryu/vn-skills/commit/b150170e172b07ec2e09f5d91a31f28389b58805)), closes [#263](https://github.com/beiryu/vn-skills/issues/263)
* **vn-address:** add convertAddresses and vn_address_convert_batch ([#198](https://github.com/beiryu/vn-skills/issues/198)) ([f0d95b4](https://github.com/beiryu/vn-skills/commit/f0d95b47817eb1525e647691f53339d92c56bb6a)), closes [#197](https://github.com/beiryu/vn-skills/issues/197)
* **vn-address:** list old wards that became a new ward ([#262](https://github.com/beiryu/vn-skills/issues/262)) ([b31f3ce](https://github.com/beiryu/vn-skills/commit/b31f3ce97f782307fa7c9cad0516b86d029e4f67)), closes [#253](https://github.com/beiryu/vn-skills/issues/253)
* **vn-einvoice:** split VAT-inclusive price into net and VAT ([#275](https://github.com/beiryu/vn-skills/issues/275)) ([884847b](https://github.com/beiryu/vn-skills/commit/884847b86f46f707c023ae629479bbd7c9686acc)), closes [#271](https://github.com/beiryu/vn-skills/issues/271)
* **vn-holidays:** add countWorkingDays, CLI count and MCP tool ([#236](https://github.com/beiryu/vn-skills/issues/236)) ([10068d9](https://github.com/beiryu/vn-skills/commit/10068d91164d1667c4f76233f914c52eed31bfab)), closes [#235](https://github.com/beiryu/vn-skills/issues/235)
* **vn-holidays:** export a year's days off as an iCalendar file ([#248](https://github.com/beiryu/vn-skills/issues/248)) ([3ca904e](https://github.com/beiryu/vn-skills/commit/3ca904e2f28a877351f26c7047118b5635af83e8))
* **vn-lunar:** add --hour to lunar from-solar and MCP tool ([#293](https://github.com/beiryu/vn-skills/issues/293)) ([819620b](https://github.com/beiryu/vn-skills/commit/819620bfc262a3febf8eb75d4f2dfb1b7fed6dd7)), closes [#288](https://github.com/beiryu/vn-skills/issues/288)
* **vn-lunar:** add month calendar to core, CLI and MCP ([#246](https://github.com/beiryu/vn-skills/issues/246)) ([2ae4ba9](https://github.com/beiryu/vn-skills/commit/2ae4ba9b9bce4aad5dd3031227848c75071dc2c5)), closes [#240](https://github.com/beiryu/vn-skills/issues/240)
* **vn-lunar:** parse Vietnamese date phrases incl. lunar dates ([#282](https://github.com/beiryu/vn-skills/issues/282)) ([5ec5201](https://github.com/beiryu/vn-skills/commit/5ec520186f8a5727ab9ebc515f3ae30638a23a2e)), closes [#280](https://github.com/beiryu/vn-skills/issues/280)
* **vn-money-words:** add toSpokenText for TTS text normalisation ([#301](https://github.com/beiryu/vn-skills/issues/301)) ([a669de3](https://github.com/beiryu/vn-skills/commit/a669de3ac086bfeb93f802229d3e098d6c81a75d)), closes [#297](https://github.com/beiryu/vn-skills/issues/297)
* **vn-money-words:** parse Vietnamese number words to digits ([#260](https://github.com/beiryu/vn-skills/issues/260)) ([69836ea](https://github.com/beiryu/vn-skills/commit/69836ea8cb9b9b5dfda30e27606a7babccb1dd02)), closes [#255](https://github.com/beiryu/vn-skills/issues/255)
* **vn-money-words:** read plain numbers with --plain in CLI and MCP ([#247](https://github.com/beiryu/vn-skills/issues/247)) ([677f84e](https://github.com/beiryu/vn-skills/commit/677f84e23870c00e2b60da508cf3f6f1258b1b5d)), closes [#238](https://github.com/beiryu/vn-skills/issues/238)


### Bug Fixes

* **cli:** give vietqr decode clear errors for empty and missing files ([#220](https://github.com/beiryu/vn-skills/issues/220)) ([40d4084](https://github.com/beiryu/vn-skills/commit/40d40847aba749bce85937494ed4388e2cc9f2a8)), closes [#215](https://github.com/beiryu/vn-skills/issues/215)
* **cli:** keep warnings off stderr in JSON mode for id and taxid ([#234](https://github.com/beiryu/vn-skills/issues/234)) ([9a3cfd4](https://github.com/beiryu/vn-skills/commit/9a3cfd4b5ffa504903755376ba84f6cae79dc454)), closes [#233](https://github.com/beiryu/vn-skills/issues/233)
* **mcp:** return per-row errors in vn_address_convert_batch ([#207](https://github.com/beiryu/vn-skills/issues/207)) ([41acede](https://github.com/beiryu/vn-skills/commit/41acede425bc4b0f748f03865acf1d20b9e4121e)), closes [#201](https://github.com/beiryu/vn-skills/issues/201)
* **vietqr:** name the exact amount in INVALID_AMOUNT for shorthand ([#229](https://github.com/beiryu/vn-skills/issues/229)) ([66ccda6](https://github.com/beiryu/vn-skills/commit/66ccda688d93a8171e1d0043041bb47e39063ebc)), closes [#227](https://github.com/beiryu/vn-skills/issues/227)
* **vietqr:** warn when a ',' grouped amount is read as thousands ([#219](https://github.com/beiryu/vn-skills/issues/219)) ([1f228c7](https://github.com/beiryu/vn-skills/commit/1f228c71af285b056f69da62b5ca6031f58eaaa6)), closes [#216](https://github.com/beiryu/vn-skills/issues/216)
* **vietqr:** warn when buildVietQR removes spaces from the account ([#212](https://github.com/beiryu/vn-skills/issues/212)) ([50d707c](https://github.com/beiryu/vn-skills/commit/50d707c01dcf5f2e5af963f7537841a6cdc43a48)), closes [#209](https://github.com/beiryu/vn-skills/issues/209)
* **vn-einvoice:** return INVALID_INVOICE from computeTotals on bad input ([#231](https://github.com/beiryu/vn-skills/issues/231)) ([cf72bf5](https://github.com/beiryu/vn-skills/commit/cf72bf58b31b3c77963a81cc4f8e153b5ecc1354)), closes [#225](https://github.com/beiryu/vn-skills/issues/225)
* **vn-id:** return EMPTY error for empty or blank input ([#221](https://github.com/beiryu/vn-skills/issues/221)) ([a79c8fd](https://github.com/beiryu/vn-skills/commit/a79c8fd84b01c930b5a1fe0b4f188143a093e900)), closes [#214](https://github.com/beiryu/vn-skills/issues/214)
* **vn-lunar:** word lunar day-out-of-range error and hint ([#230](https://github.com/beiryu/vn-skills/issues/230)) ([463dd0a](https://github.com/beiryu/vn-skills/commit/463dd0ada3ce3d2180fea0b20c478032f101ce48)), closes [#226](https://github.com/beiryu/vn-skills/issues/226)
* **vn-number-format:** add hint to INVALID_NUMBER error ([#213](https://github.com/beiryu/vn-skills/issues/213)) ([4ee3b2e](https://github.com/beiryu/vn-skills/commit/4ee3b2e0c6da81639a81de22920b7c657015b035)), closes [#208](https://github.com/beiryu/vn-skills/issues/208)
* **vn-number-format:** return EMPTY from parseAmount for blank input ([#224](https://github.com/beiryu/vn-skills/issues/224)) ([cccbbbd](https://github.com/beiryu/vn-skills/commit/cccbbbd66e5555f5a9c2ed68fdd251b6581d0e52)), closes [#222](https://github.com/beiryu/vn-skills/issues/222)


### Documentation

* **repo:** add llms-install.md for Cline MCP setup ([#195](https://github.com/beiryu/vn-skills/issues/195)) ([b6a5655](https://github.com/beiryu/vn-skills/commit/b6a56557f09b0905cc21afa95b625b0770060638)), closes [#193](https://github.com/beiryu/vn-skills/issues/193)

## [0.7.0](https://github.com/beiryu/vn-skills/compare/v0.6.0...v0.7.0) (2026-10-25)


### Features

* **cli:** add address convert-file for bulk address conversion ([#161](https://github.com/beiryu/vn-skills/issues/161)) ([7098012](https://github.com/beiryu/vn-skills/commit/7098012880a6e7592865ce5f4b18a6d01266b11b)), closes [#156](https://github.com/beiryu/vn-skills/issues/156)
* **cli:** add install --agent agents for .agents/skills ([#167](https://github.com/beiryu/vn-skills/issues/167)) ([70049ba](https://github.com/beiryu/vn-skills/commit/70049ba03acbcb3d24509edef7bc2edb3464a8d5)), closes [#163](https://github.com/beiryu/vn-skills/issues/163)
* **cli:** add install --agent copilot ([#181](https://github.com/beiryu/vn-skills/issues/181)) ([47b2656](https://github.com/beiryu/vn-skills/commit/47b265608d773f1403a86c6c401dea9ebb03ad00)), closes [#176](https://github.com/beiryu/vn-skills/issues/176)


### Bug Fixes

* **cli:** accept negative amounts in money words ([#160](https://github.com/beiryu/vn-skills/issues/160)) ([0f56eb8](https://github.com/beiryu/vn-skills/commit/0f56eb821534961791b1ecea83fc1d0beb7f11a2)), closes [#157](https://github.com/beiryu/vn-skills/issues/157)
* **cli:** honour --json in address convert-file errors ([#191](https://github.com/beiryu/vn-skills/issues/191)) ([54b59f0](https://github.com/beiryu/vn-skills/commit/54b59f06685d5cd21dc83e431781fddda6e82afb)), closes [#184](https://github.com/beiryu/vn-skills/issues/184)
* **cli:** reject prototype-key agents in install with Unknown agent error ([#189](https://github.com/beiryu/vn-skills/issues/189)) ([f62d5dd](https://github.com/beiryu/vn-skills/commit/f62d5dd9e2394e175227ff0f79f75e358a3bf572)), closes [#187](https://github.com/beiryu/vn-skills/issues/187)
* **mcp:** cover all skills in MCP Registry description ([#150](https://github.com/beiryu/vn-skills/issues/150)) ([b794f61](https://github.com/beiryu/vn-skills/commit/b794f6102abf499b218adef400c62fbf8505f48f)), closes [#144](https://github.com/beiryu/vn-skills/issues/144)
* **vietqr:** find the CRC tag by position when the CRC is 6304 ([#192](https://github.com/beiryu/vn-skills/issues/192)) ([aa53cbf](https://github.com/beiryu/vn-skills/commit/aa53cbfac4c2b4d142035f2ac697814ff72177b5)), closes [#183](https://github.com/beiryu/vn-skills/issues/183)
* **vietqr:** handle null and non-string notes without throwing ([#152](https://github.com/beiryu/vn-skills/issues/152)) ([485b9f4](https://github.com/beiryu/vn-skills/commit/485b9f42034eb8c29462e10a013def15c84d3331)), closes [#142](https://github.com/beiryu/vn-skills/issues/142)
* **vietqr:** warn when a parsed payload was lower-cased in transit ([#138](https://github.com/beiryu/vn-skills/issues/138)) ([69b4b46](https://github.com/beiryu/vn-skills/commit/69b4b463615a289f9a822e9c7400c8ecb470d216)), closes [#131](https://github.com/beiryu/vn-skills/issues/131)
* **vn-einvoice:** report an error when totals are not finite or too large ([#151](https://github.com/beiryu/vn-skills/issues/151)) ([641a632](https://github.com/beiryu/vn-skills/commit/641a6325c28cb2f69f18ef9ca5f75be231f639e1)), closes [#143](https://github.com/beiryu/vn-skills/issues/143)
* **vn-lunar:** reject out-of-range day and month in parseDateInput ([#137](https://github.com/beiryu/vn-skills/issues/137)) ([9d9ffc7](https://github.com/beiryu/vn-skills/commit/9d9ffc7710941a5dcc94a0e51d624de28ea207c3)), closes [#132](https://github.com/beiryu/vn-skills/issues/132)
* **vn-lunar:** return INVALID_TIMEZONE for a bad timeZone ([#180](https://github.com/beiryu/vn-skills/issues/180)) ([719b5e1](https://github.com/beiryu/vn-skills/commit/719b5e18a4059cfa03bd1897d916f6ddea298081)), closes [#179](https://github.com/beiryu/vn-skills/issues/179)
* **vn-money-words:** cap digit count in moneyToWords ([#168](https://github.com/beiryu/vn-skills/issues/168)) ([066ab1d](https://github.com/beiryu/vn-skills/commit/066ab1ddfd428ea43d63f039b17b015dd33e847d)), closes [#162](https://github.com/beiryu/vn-skills/issues/162)
* **vn-number-format:** round the written decimal half away from zero ([#173](https://github.com/beiryu/vn-skills/issues/173)) ([da11a52](https://github.com/beiryu/vn-skills/commit/da11a5296cc55cfeee4845b5e83cd492b805599a)), closes [#170](https://github.com/beiryu/vn-skills/issues/170)
* **vn-phone:** drop the trunk 0 written after +84 ([#159](https://github.com/beiryu/vn-skills/issues/159)) ([606b07c](https://github.com/beiryu/vn-skills/commit/606b07c4bcb3582917437f8426e3a40a4be74a4c)), closes [#158](https://github.com/beiryu/vn-skills/issues/158)
* **vn-tax-id:** return EMPTY error for empty or blank input ([#153](https://github.com/beiryu/vn-skills/issues/153)) ([6fa602f](https://github.com/beiryu/vn-skills/commit/6fa602f18ff7646ff3ae6777a3d1b32d4c656fbb)), closes [#141](https://github.com/beiryu/vn-skills/issues/141)
* **vn-tax-id:** treat underscore as branch separator ([#174](https://github.com/beiryu/vn-skills/issues/174)) ([8f115a7](https://github.com/beiryu/vn-skills/commit/8f115a70679fb047d333537ae4a6e9e512693be0)), closes [#169](https://github.com/beiryu/vn-skills/issues/169)


### Documentation

* **mcp:** group README MCP tool list by skill ([#149](https://github.com/beiryu/vn-skills/issues/149)) ([37db769](https://github.com/beiryu/vn-skills/commit/37db769981a7087efb5d041921023b25014d6112)), closes [#145](https://github.com/beiryu/vn-skills/issues/145)
* **repo:** add MCP client setup for Cursor, VS Code, Claude Desktop, Codex ([#136](https://github.com/beiryu/vn-skills/issues/136)) ([ab515bc](https://github.com/beiryu/vn-skills/commit/ab515bc8d1af338f721b87e143f04c1e824b190b)), closes [#133](https://github.com/beiryu/vn-skills/issues/133)
* **repo:** say Copilot loads skills from .agents/skills ([#182](https://github.com/beiryu/vn-skills/issues/182)) ([2180577](https://github.com/beiryu/vn-skills/commit/2180577c68193e28b77ffc16fe3f05d6b4c50b0b)), closes [#175](https://github.com/beiryu/vn-skills/issues/175)

## [0.6.0](https://github.com/beiryu/vn-skills/compare/v0.5.0...v0.6.0) (2026-10-23)


### Features

* **cli:** accept unquoted multi-word text for free-text arguments ([#122](https://github.com/beiryu/vn-skills/issues/122)) ([d93e406](https://github.com/beiryu/vn-skills/commit/d93e406e3af9c3a02ffc97857ff3679f962ad879)), closes [#115](https://github.com/beiryu/vn-skills/issues/115)
* **vn-id:** warn when decoded CCCD birth year is in the future ([#125](https://github.com/beiryu/vn-skills/issues/125)) ([87233b8](https://github.com/beiryu/vn-skills/commit/87233b8992abc70909544b401fa720bc4b7aaa6a)), closes [#112](https://github.com/beiryu/vn-skills/issues/112)


### Bug Fixes

* **vietqr:** truncate raw notes by code point ([#121](https://github.com/beiryu/vn-skills/issues/121)) ([20ac3eb](https://github.com/beiryu/vn-skills/commit/20ac3ebecf59da06be6aa0f125057942734219e6)), closes [#116](https://github.com/beiryu/vn-skills/issues/116)
* **vn-holidays:** give OUT_OF_RANGE a correct hint and name the date ([#124](https://github.com/beiryu/vn-skills/issues/124)) ([db78e91](https://github.com/beiryu/vn-skills/commit/db78e9123b92e525d0b54857fa177c6b05fea24b)), closes [#113](https://github.com/beiryu/vn-skills/issues/113)
* **vn-name:** handle null and non-string input without throwing ([#126](https://github.com/beiryu/vn-skills/issues/126)) ([63ce07e](https://github.com/beiryu/vn-skills/commit/63ce07e36e48afd8daf847ce48d63b7f88c6d56a))
* **vn-phone:** return EMPTY for empty input and add hints to errors ([#123](https://github.com/beiryu/vn-skills/issues/123)) ([8b4115c](https://github.com/beiryu/vn-skills/commit/8b4115c94ef9aa3f33cba52272ad97d14e8ba13c)), closes [#114](https://github.com/beiryu/vn-skills/issues/114)


### Documentation

* **vietqr:** state vn-skills is an offline toolkit, not a payment gateway ([#120](https://github.com/beiryu/vn-skills/issues/120)) ([791edd4](https://github.com/beiryu/vn-skills/commit/791edd446680f800ddc1dbb49cc5afb4ca7f9045)), closes [#118](https://github.com/beiryu/vn-skills/issues/118)

## [0.5.0](https://github.com/beiryu/vn-skills/compare/v0.4.0...v0.5.0) (2026-10-22)


### Features

* **mcp:** add vietqr_decode tool ([#84](https://github.com/beiryu/vn-skills/issues/84)) ([2d1a4b0](https://github.com/beiryu/vn-skills/commit/2d1a4b0133d889488bfcb7f87aa91a8c6dcd5d1e)), closes [#75](https://github.com/beiryu/vn-skills/issues/75)
* **repo:** add Claude Code plugin marketplace manifest ([#87](https://github.com/beiryu/vn-skills/issues/87)) ([e3681fb](https://github.com/beiryu/vn-skills/commit/e3681fb2da602dc660b475f55f9d2bf0b4946c4e)), closes [#86](https://github.com/beiryu/vn-skills/issues/86)


### Bug Fixes

* **vn-number-format:** accept years 0001-0099 in formatDate ([#99](https://github.com/beiryu/vn-skills/issues/99)) ([3623817](https://github.com/beiryu/vn-skills/commit/3623817ddf1cb1530fe4e5f486b98d7302e58490)), closes [#96](https://github.com/beiryu/vn-skills/issues/96)
* **vn-number-format:** explain why amounts like '1.5' are rejected ([#101](https://github.com/beiryu/vn-skills/issues/101)) ([3588563](https://github.com/beiryu/vn-skills/commit/358856320c99234c73583d96b8d3f3fd08431fb1)), closes [#94](https://github.com/beiryu/vn-skills/issues/94)
* **vn-number-format:** return errors for non-string input ([#100](https://github.com/beiryu/vn-skills/issues/100)) ([321d656](https://github.com/beiryu/vn-skills/commit/321d6560ab600971d1800471d85c5d271c4c9a51)), closes [#95](https://github.com/beiryu/vn-skills/issues/95)
* **vn-number-format:** validate maxFractionDigits and group |n| &gt;= 1e21 ([#97](https://github.com/beiryu/vn-skills/issues/97)) ([571df77](https://github.com/beiryu/vn-skills/commit/571df77bbe933d4a28be34787b952593a4ecf749)), closes [#91](https://github.com/beiryu/vn-skills/issues/91)


### Documentation

* **mcp:** add mcp, vietnam, vietqr keywords to npm package ([#80](https://github.com/beiryu/vn-skills/issues/80)) ([86b5091](https://github.com/beiryu/vn-skills/commit/86b5091b1fc4f00811beca6e215adc1cdf354c23)), closes [#79](https://github.com/beiryu/vn-skills/issues/79)
* **repo:** add 5-minute quickstart in English and Vietnamese ([#82](https://github.com/beiryu/vn-skills/issues/82)) ([2fbfa57](https://github.com/beiryu/vn-skills/commit/2fbfa5748aecb2e01ad25d6f644b33ce8dab37d5))
* **repo:** cover all 11 skills in npm descriptions and keywords ([#90](https://github.com/beiryu/vn-skills/issues/90)) ([d15df39](https://github.com/beiryu/vn-skills/commit/d15df394e1b94aa994b96bad4cafcd6e07cb0f6b)), closes [#89](https://github.com/beiryu/vn-skills/issues/89)
* **repo:** make README einvoice example runnable ([#102](https://github.com/beiryu/vn-skills/issues/102)) ([0d78a87](https://github.com/beiryu/vn-skills/commit/0d78a87ed497be9e21a3beb2a84c7b47602fdc55)), closes [#93](https://github.com/beiryu/vn-skills/issues/93)

## [0.4.0](https://github.com/beiryu/vn-skills/compare/v0.3.3...v0.4.0) (2026-10-21)


### Features

* **vn-holidays:** official days off per year and working-day arithmetic ([#56](https://github.com/beiryu/vn-skills/issues/56)) ([a7ff076](https://github.com/beiryu/vn-skills/commit/a7ff076b7b1bb28c53a357b01eff8ccd8a947728))


### Bug Fixes

* **vn-lunar:** replace the lunar engine with an independent Meeus implementation ([#54](https://github.com/beiryu/vn-skills/issues/54)) ([bcafa6c](https://github.com/beiryu/vn-skills/commit/bcafa6c052b16d851f304b87573dbe1fa9ba03b6))

## [0.3.3](https://github.com/beiryu/vn-skills/compare/v0.3.2...v0.3.3) (2026-10-19)


### Documentation

* **core:** ship third-party notices for bundled data and a trademark disclaimer ([#52](https://github.com/beiryu/vn-skills/issues/52)) ([8e0c318](https://github.com/beiryu/vn-skills/commit/8e0c3187beb4513e18194d2cbdc3255523bab98e))

## [0.3.2](https://github.com/beiryu/vn-skills/compare/v0.3.1...v0.3.2) (2026-10-19)


### Bug Fixes

* **core:** make address splitting, VietQR amounts and email checks linear-time ([#50](https://github.com/beiryu/vn-skills/issues/50)) ([43ab858](https://github.com/beiryu/vn-skills/commit/43ab8587c9a557fdbdfe598b3265ca6c5409c4fb))

## [0.3.1](https://github.com/beiryu/vn-skills/compare/v0.3.0...v0.3.1) (2026-10-18)


### Documentation

* **repo:** list all MCP tools and refresh README roadmap ([#47](https://github.com/beiryu/vn-skills/issues/47)) ([93b870a](https://github.com/beiryu/vn-skills/commit/93b870a779b8c9e1d21942d1992eff6432485713)), closes [#46](https://github.com/beiryu/vn-skills/issues/46)

## [0.3.0](https://github.com/beiryu/vn-skills/compare/v0.2.1...v0.3.0) (2026-10-18)


### ⚠ BREAKING CHANGES

* **repo:** @vn-skills/core, @vn-skills/cli and @vn-skills/mcp require Node.js 22.12 or later.

### Build

* **repo:** require Node.js 22.12 or later ([#44](https://github.com/beiryu/vn-skills/issues/44)) ([f01b157](https://github.com/beiryu/vn-skills/commit/f01b15718594e9f9fb55cedae5023a479c8181a6))

## [0.2.1](https://github.com/beiryu/vn-skills/compare/v0.2.0...v0.2.1) (2026-10-18)


### Bug Fixes

* **core:** keep VERSION in step with the released version ([#34](https://github.com/beiryu/vn-skills/issues/34)) ([e7c679d](https://github.com/beiryu/vn-skills/commit/e7c679d098d6546fc88044871f013de5159c4623))

## [0.2.0](https://github.com/beiryu/vn-skills/compare/v0.1.1...v0.2.0) (2026-10-18)


### Features

* **cli:** add install command for agent skill folders ([#26](https://github.com/beiryu/vn-skills/issues/26)) ([b64db4b](https://github.com/beiryu/vn-skills/commit/b64db4bb16a4ff16757074eea7608fd95a890e54)), closes [#3](https://github.com/beiryu/vn-skills/issues/3)
* **mcp:** add tools for lunar tet/canchi, tax-id, province and einvoice example ([#18](https://github.com/beiryu/vn-skills/issues/18)) ([e3aee1d](https://github.com/beiryu/vn-skills/commit/e3aee1d8ef539d47bca06620638f73855b7e9912)), closes [#17](https://github.com/beiryu/vn-skills/issues/17)
* **skill:** add vn-id CCCD and CMND parser ([#31](https://github.com/beiryu/vn-skills/issues/31)) ([46ad1df](https://github.com/beiryu/vn-skills/commit/46ad1df852820e830503259f46e2db393728baa5)), closes [#6](https://github.com/beiryu/vn-skills/issues/6)
* **skill:** add vn-name to split and sort Vietnamese names ([#25](https://github.com/beiryu/vn-skills/issues/25)) ([9254e9e](https://github.com/beiryu/vn-skills/commit/9254e9ea1cbb3736852445c5738e3628d40d73bf))
* **skill:** add vn-number-format for VN number, VND and date formatting ([#24](https://github.com/beiryu/vn-skills/issues/24)) ([f22e3c1](https://github.com/beiryu/vn-skills/commit/f22e3c16f8151cda574f1f5f6c105bc85823c66c)), closes [#9](https://github.com/beiryu/vn-skills/issues/9)
* **skill:** add vn-phone phone number normalise and classify ([#30](https://github.com/beiryu/vn-skills/issues/30)) ([8e3e0cb](https://github.com/beiryu/vn-skills/commit/8e3e0cb2fe0c50dcea92eed60531b4d854dc1f35))
* **vietqr:** decode VietQR from a PNG image ([#29](https://github.com/beiryu/vn-skills/issues/29)) ([afde051](https://github.com/beiryu/vn-skills/commit/afde051eae21667bf8ea05aed0a051587306db88))


### Documentation

* **repo:** describe the maintainer workflow without agent labels ([#23](https://github.com/beiryu/vn-skills/issues/23)) ([1349d61](https://github.com/beiryu/vn-skills/commit/1349d612f716e04efc894e082fde2c28649179d6))
* **repo:** mark RM-005 done ([#32](https://github.com/beiryu/vn-skills/issues/32)) ([23473ef](https://github.com/beiryu/vn-skills/commit/23473ef5b9e533766cdd5b09bbad0b82f702bb31))
* **repo:** sync ROADMAP.md status lines with issues and merged work ([#22](https://github.com/beiryu/vn-skills/issues/22)) ([a49d04f](https://github.com/beiryu/vn-skills/commit/a49d04f5165d49a4e18bb40ceb39233c914c107b)), closes [#21](https://github.com/beiryu/vn-skills/issues/21)

## [0.1.1](https://github.com/beiryu/vn-skills/compare/v0.1.0...v0.1.1) (2026-10-17)


### Bug Fixes

* **repo:** widen implementer tool allowlist and report agent errors on hand-back ([#13](https://github.com/beiryu/vn-skills/issues/13)) ([dcc1729](https://github.com/beiryu/vn-skills/commit/dcc172903aedba206e7e80fccaa687a0b832a70c))
