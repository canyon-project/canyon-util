import CanyonUtil  from '../src';
import {cov} from "../src/mock";

describe('blah', () => {
  it('works', async () => {
    const formatReportObjectRes = await CanyonUtil.formatReportObject(cov)
    console.log(formatReportObjectRes)
    const s = CanyonUtil.genTreeSummaryMain(formatReportObjectRes.coverage)
    console.log(s)
  });
});
