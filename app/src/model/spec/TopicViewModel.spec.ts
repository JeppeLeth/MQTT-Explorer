import 'mocha'
import { expect } from 'chai'
import { TreeNodeFactory } from '../../../../backend/src/Model'
import { Base64Message } from '../../../../backend/src/Model/Base64Message'
import { TopicViewModel } from '../TopicViewModel'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function makeNode() {
  const node = TreeNodeFactory.fromMessage<TopicViewModel>({
    topic: 'a/b',
    payload: Base64Message.fromString('1'),
    retain: false,
    qos: 0,
    messageId: undefined,
  })
  node.viewModel = new TopicViewModel(node)
  return node
}

describe('TopicViewModel', function () {
  this.timeout(5000)
  it('keeps its state when it is released and retained again right away (remount)', async () => {
    const node = makeNode()
    const viewModel = node.viewModel!
    viewModel.retain()
    viewModel.setSelected(true)
    viewModel.setExpanded(true, false)

    viewModel.release()
    await wait(20)
    viewModel.retain()
    await wait(TopicViewModel.destroyGracePeriodMs + 50)

    expect(node.viewModel).to.eq(viewModel)
    expect(viewModel.isSelected()).to.eq(true)
    expect(viewModel.isExpanded()).to.eq(true)
  })

  it('is destroyed once nothing retains it anymore', async () => {
    const node = makeNode()
    const viewModel = node.viewModel!
    viewModel.retain()
    viewModel.release()
    expect(node.viewModel).to.eq(viewModel)
    await wait(TopicViewModel.destroyGracePeriodMs + 50)
    expect(node.viewModel).to.eq(undefined)
  })
})
