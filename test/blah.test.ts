import CanyonUtil  from '../src';
import {cov} from "../src/mock";

describe('blah', () => {
  it('works', async () => {
    const formatReportObjectRes = await CanyonUtil.formatReportObject(cov)
    console.log(formatReportObjectRes)
    console.log(CanyonUtil.genTreeSummaryMain(formatReportObjectRes.coverage))
  });
});
