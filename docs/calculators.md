# 필요한 계산기를 골라 말하면 됩니다

**58개 계산기를 각각의 스킬로 사용할 수 있습니다.** 이름을 몰라도 “집을 살 때 드는 세금”처럼 상황을 설명하면 AI가 맞는 계산기를 고릅니다.

| 계산기 | 할 수 있는 일 | Codex 스킬 | 계산 범위 |
| --- | --- | --- | --- |
| [빚 갚을 능력 비율(DSR)](../skills/dsr/SKILL.md) | 연소득에서 대출을 갚는 돈이 차지하는 비율과 입력한 한도 안의 대출액을 계산합니다. | `$dsr` | 가정 시뮬레이션 |
| [소득 대비 빚 비율(DTI)](../skills/dti/SKILL.md) | 주택담보대출 상환액과 다른 대출의 이자가 연소득에서 차지하는 비율을 계산합니다. | `$dti` | 가정 시뮬레이션 |
| [임대소득 대비 이자(RTI)](../skills/rti/SKILL.md) | 임대수입이 대출이자의 몇 배인지와 이자 부담으로 역산한 대출액을 계산합니다. | `$rti` | 가정 시뮬레이션 |
| [집값 대비 대출(LTV)](../skills/ltv/SKILL.md) | 집값에서 기존 채권과 방공제를 뺀 담보 기준 대출액을 계산합니다. | `$ltv` | 가정 시뮬레이션 |
| [주택담보대출 가능액](../skills/daechul-hando/SKILL.md) | 집값으로 정한 한도와 소득으로 정한 한도를 비교해 더 작은 대출액을 계산합니다. | `$daechul-hando` | 가정 시뮬레이션 |
| [추정·인정소득](../skills/chujeong-sodeuk/SKILL.md) | 보험료나 카드 사용액으로 소득을 역산하고 입력한 인정 비율과 상한을 적용합니다. | `$chujeong-sodeuk` | 가정 시뮬레이션 |
| [장래소득](../skills/jangrae-sodeuk/SKILL.md) | 현재 소득에 나이별 증가율을 적용해 대출 심사용 소득의 변화를 계산합니다. | `$jangrae-sodeuk` | 가정 시뮬레이션 |
| [대출 이자·상환표](../skills/daechul-ija/SKILL.md) | 매달 갚을 돈과 만기까지의 총이자를 상환 방식에 따라 계산합니다. | `$daechul-ija` | 예상 계산 |
| [대출 대환 이자 비교](../skills/daehwan/SKILL.md) | 기존 대출을 새 대출로 바꿀 때 이자와 비용이 얼마나 달라지는지 계산합니다. | `$daehwan` | 예상 계산 |
| [중도상환수수료](../skills/jungdo/SKILL.md) | 약정 만기보다 일찍 갚는 대출금에 대해 기간 비례 수수료를 계산합니다. | `$jungdo` | 예상 계산 |
| [경락잔금대출 한도](../skills/gyeongnak/SKILL.md) | 경매 낙찰가와 감정가에 대출 비율을 적용해 잔금대출의 담보 기준 금액을 계산합니다. | `$gyeongnak` | 가정 시뮬레이션 |
| [예금·적금 이자](../skills/yejeokgeum/SKILL.md) | 예금이나 적금의 세전 이자, 이자에서 뺄 세금과 만기 수령액을 계산합니다. | `$yejeokgeum` | 예상 계산 |
| [전월세 전환·보증금 조정](../skills/jeonwolse/SKILL.md) | 보증금과 월세를 서로 바꿀 때 달라지는 보증금과 월세를 계산합니다. | `$jeonwolse` | 예상 계산 |
| [임대료 상승분](../skills/imdaeryo-sangseung/SKILL.md) | 현재 보증금과 월세에 증액 상한을 적용하고 마지막 계약·인상 이후의 기간을 확인합니다. | `$imdaeryo-sangseung` | 예상 계산 |
| [임대수익률](../skills/imdae-suik/SKILL.md) | 집이나 상가를 빌려주어 남는 돈과 투자금 대비 수익률을 계산합니다. | `$imdae-suik` | 가정 시뮬레이션 |
| [전세와 월세 비교](../skills/jeonse-vs-wolse/SKILL.md) | 전세대출 이자와 보증금을 다른 곳에 맡겼다면 받을 이자를 고려해 월 부담을 비교합니다. | `$jeonse-vs-wolse` | 가정 시뮬레이션 |
| [전세보증보험](../skills/bojeung-boheom/SKILL.md) | 전세보증금과 선순위 채권으로 담보 한도를 점검하고 입력한 요율로 보증료를 계산합니다. | `$bojeung-boheom` | 가정 시뮬레이션 |
| [연체 임대료 이자](../skills/yeonche/SKILL.md) | 밀린 월세 원금과 지연 일수에 따른 이자를 계산합니다. | `$yeonche` | 예상 계산 |
| [환산임대료(NOC)](../skills/noc/SKILL.md) | 보증금·월세·관리비를 월 비용으로 합쳐 사무실이나 상가의 실제 사용 면적당 부담을 비교합니다. | `$noc` | 가정 시뮬레이션 |
| [간주임대료](../skills/ganju/SKILL.md) | 보증금의 일부를 임대수입으로 보는 금액을 계산해 주택임대소득 계산에 연결합니다. | `$ganju` | 예상 계산 |
| [주택임대소득세](../skills/imdae-sodeuk/SKILL.md) | 과세 대상 월세와 간주임대료로 분리과세 세금과 종합과세 증가분을 비교합니다. | `$imdae-sodeuk` | 가정 시뮬레이션 |
| [명도비용](../skills/myeongdo/SKILL.md) | 임차인이 집을 비우는 절차에 드는 소송·집행·보관 비용과 못 받는 월세를 합산합니다. | `$myeongdo` | 가정 시뮬레이션 |
| [중개보수(복비)](../skills/junggae/SKILL.md) | 매매나 임대차 거래에서 한쪽 당사자가 부담할 중개보수의 상한과 부가가치세를 계산합니다. | `$junggae` | 예상 계산 |
| [등기비용](../skills/deunggi/SKILL.md) | 매매로 부동산을 산 뒤 소유권을 옮길 때 드는 취득세와 등기 비용을 합산합니다. | `$deunggi` | 예상 계산 |
| [경매 배당](../skills/baedang/SKILL.md) | 경매 낙찰대금을 정해진 순서로 나누었을 때 각 채권자가 받을 돈을 계산합니다. | `$baedang` | 가정 시뮬레이션 |
| [법무사 보수](../skills/beopmusa/SKILL.md) | 부동산의 명의를 옮길 때 법무사에게 지급할 보수를 추정합니다. | `$beopmusa` | 예상 계산 |
| [국민주택채권](../skills/chaegwon/SKILL.md) | 등기 때 국민주택채권을 사고 바로 팔면 부담할 할인비용을 계산합니다. | `$chaegwon` | 예상 계산 |
| [경매 최저가 · 입찰보증금](../skills/choejeoga/SKILL.md) | 경매가 유찰될 때 최저매각가격과 필요한 입찰보증금이 얼마나 줄어드는지 계산합니다. | `$choejeoga` | 가정 시뮬레이션 |
| [대지지분](../skills/daeji-jibun/SKILL.md) | 단지 땅에서 내 집이 차지하는 몫과 그 땅의 공시지가 기준 가액을 추정합니다. | `$daeji-jibun` | 예상 계산 |
| [평당 · ㎡당 가격](../skills/danwi-gagyeok/SKILL.md) | 전체 부동산 가격을 1평당 가격과 1㎡당 가격으로 바꿉니다. | `$danwi-gagyeok` | 예상 계산 |
| [감정평가 (원가·비교·수익 8방식)](../skills/gamjeong/SKILL.md) | 부동산 가격이나 연 임대료를 선택한 평가 방식으로 추정합니다. 선택한 방식에 필요한 정보만 묻습니다. | `$gamjeong` | 가정 시뮬레이션 |
| [감정평가수수료](../skills/gamjeong-susuryo/SKILL.md) | 감정평가를 의뢰할 때 드는 수수료와 부가가치세를 추정합니다. | `$gamjeong-susuryo` | 예상 계산 |
| [건물 부가가치세](../skills/geonmul-buga/SKILL.md) | 토지와 건물을 함께 거래할 때 과세 대상 건물에 붙는 부가가치세를 계산합니다. | `$geonmul-buga` | 예상 계산 |
| [건폐율 · 용적률](../skills/geonpye-yongjeok/SKILL.md) | 땅 대비 건물 면적의 비율과 입력한 상한에 따른 최대 건축면적을 계산합니다. | `$geonpye-yongjeok` | 예상 계산 |
| [건물 기준시가](../skills/gijun-siga/SKILL.md) | 국세청 산식에 면적과 해당 연도 지수를 넣어 건물 기준시가를 계산합니다. | `$gijun-siga` | 예상 계산 |
| [길이 환산](../skills/gilyi/SKILL.md) | 길이를 미터·피트·인치·자 등 여러 단위로 바꿉니다. | `$gilyi` | 예상 계산 |
| [경매 신청 비용](../skills/gyeongmae-biyong/SKILL.md) | 채권자가 경매를 신청할 때 미리 낼 세금·송달료·감정료 등을 추정합니다. | `$gyeongmae-biyong` | 가정 시뮬레이션 |
| [인지세](../skills/inji/SKILL.md) | 부동산 매매계약서에 붙는 인지세와 매수인이 나눠 낼 몫을 계산합니다. | `$inji` | 예상 계산 |
| [재건축 연한](../skills/jaegeonchuk/SKILL.md) | 준공연도에 적용 연한을 더해 재건축 연한이 되는 해를 계산합니다. | `$jaegeonchuk` | 예상 계산 |
| [건물 잔존가치](../skills/janjon/SKILL.md) | 오래된 건물의 가치가 새 건물 대비 얼마나 남는지 입력한 감가 조건으로 추정합니다. | `$janjon` | 가정 시뮬레이션 |
| [경매 적정 입찰가](../skills/jeokjeong-ipchal/SKILL.md) | 경매로 산 부동산의 임대수익을 기준으로 입찰가격 시나리오를 계산합니다. | `$jeokjeong-ipchal` | 가정 시뮬레이션 |
| [적정 매수가 · 적정 입찰가](../skills/jeokjeong-maesu/SKILL.md) | 예상 임대수입과 목표 수익률로 감당할 수 있는 매수가격을 역산합니다. | `$jeokjeong-maesu` | 가정 시뮬레이션 |
| [지적측량수수료](../skills/jijeok/SKILL.md) | 토지 측량의 기본단가·면적·필지 수로 측량비를 거칠게 추정합니다. | `$jijeok` | 가정 시뮬레이션 |
| [지역자원시설세(소방분)](../skills/jiyeok/SKILL.md) | 건물 재산세와 함께 부과되는 소방분 지역자원시설세를 계산합니다. | `$jiyeok` | 예상 계산 |
| [종합소득세](../skills/jonghap/SKILL.md) | 여러 소득을 합산한 뒤 공제와 이미 낸 세금을 반영해 종합소득세를 추정합니다. | `$jonghap` | 예상 계산 |
| [날짜 · 기간](../skills/nalja/SKILL.md) | 시작일과 종료일 사이의 일수와 달력상 기간을 계산합니다. | `$nalja` | 예상 계산 |
| [누진세율 속산표](../skills/nujin/SKILL.md) | 공제를 마친 과세표준에 선택한 누진세율표를 적용해 기본 세액을 계산합니다. | `$nujin` | 예상 계산 |
| [평수 · 면적 환산](../skills/pyeongsu/SKILL.md) | 면적을 제곱미터·평·제곱피트로 바꿉니다. | `$pyeongsu` | 예상 계산 |
| [리모델링 수익](../skills/remodeling/SKILL.md) | 리모델링 비용에 비해 월세 증가와 예상 매각가격 상승으로 얼마나 남는지 계산합니다. | `$remodeling` | 가정 시뮬레이션 |
| [취득세](../skills/chwideuk/SKILL.md) | 부동산을 살 때·받을 때 내는 취득세와 함께 붙는 세금을 계산합니다. | `$chwideuk` | 예상 계산 |
| [증여세](../skills/jeungyeo/SKILL.md) | 가족이나 다른 사람에게 재산을 받을 때 내는 증여세를 계산합니다. | `$jeungyeo` | 예상 계산 |
| [상속세](../skills/sangsok/SKILL.md) | 사망한 가족의 재산을 물려받을 때 내는 상속세를 계산합니다. | `$sangsok` | 예상 계산 |
| [재산세](../skills/jaesan/SKILL.md) | 부동산을 보유하면서 내는 재산세와 함께 붙는 세금을 계산합니다. | `$jaesan` | 예상 계산 |
| [법인 부동산 양도](../skills/beopin-yangdo/SKILL.md) | 회사가 부동산을 팔아서 추가로 부담하는 법인세와 지방소득세를 계산합니다. | `$beopin-yangdo` | 예상 계산 |
| [법정상속분](../skills/sangsok-jibun/SKILL.md) | 배우자와 자녀 등 가족이 법에 따라 나누는 기본 상속 비율을 계산합니다. | `$sangsok-jibun` | 예상 계산 |
| [양도세 간편 시나리오](../skills/yangdo/SKILL.md) | 2년 이상 보유한 주택의 매매차익에 기준 산식을 적용해 세금 규모를 살펴봅니다. | `$yangdo` | 가정 시뮬레이션 |
| [양도세 개편안 비교](../skills/yangdo-sim/SKILL.md) | 같은 주택을 2026년부터 2029년 사이에 판다는 가정으로 기준 산식과 개편안 시나리오를 비교합니다. | `$yangdo-sim` | 가정 시뮬레이션 |
| [보유세 비교](../skills/boyuse/SKILL.md) | 집 한 채를 가진 세대의 명의·거주 조건에 따라 보유세가 어떻게 달라지는지 비교합니다. | `$boyuse` | 가정 시뮬레이션 |

**Claude Code에서는 이름 앞에 플러그인 이름을 붙입니다.** 예를 들어 취득세는 `/budongsan-skills:chwideuk`으로 실행합니다.
