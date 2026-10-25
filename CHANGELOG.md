# Changelog

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
