import * as q from '../../../backend/src/Model'
import { Destroyable } from '../../../backend/src/Model/Destroyable'
import { EventDispatcher } from '../../../events'
import { MessageDecoder, decoders } from '../decoders'

function findDecoder<T extends Destroyable>(node: q.TreeNode<T>): TopicDecoder | undefined {
  const decoder = decoders.find(
    decoder =>
      decoder.canDecodeTopic?.(node.path()) || (node.message?.payload && decoder.canDecodeData?.(node.message?.payload))
  )

  return decoder
    ? {
        decoder,
        format: undefined,
      }
    : undefined
}

type TopicDecoder = { decoder: MessageDecoder; format: string | undefined }

export class TopicViewModel implements Destroyable {
  public static destroyGracePeriodMs = 1000

  private selected: boolean

  private expanded: boolean

  private owner: q.TreeNode<TopicViewModel> | undefined

  private _decoder?: TopicDecoder

  /**
   * Reference counter for useViewModel hook
   */
  private referenceCounter = 0

  private pendingDestroy?: ReturnType<typeof setTimeout>

  public selectionChange = new EventDispatcher<void>()

  public expandedChange = new EventDispatcher<void>()

  public onDecoderChange = new EventDispatcher<TopicDecoder | undefined>()

  get decoder(): TopicDecoder | undefined {
    if (!this._decoder) {
      this._decoder = this.owner && findDecoder(this.owner)
    }

    return this._decoder
  }

  set decoder(override: TopicDecoder | undefined) {
    this._decoder = override

    this.onDecoderChange.dispatch(override)
  }

  public constructor(treeNode: q.TreeNode<TopicViewModel>) {
    this.owner = treeNode
    this.selected = false
    this.expanded = false
  }

  public retain() {
    this.referenceCounter += 1
    if (this.pendingDestroy) {
      clearTimeout(this.pendingDestroy)
      this.pendingDestroy = undefined
    }
  }

  /**
   * Destroys the view model once nothing references it anymore. Destruction is deferred: when the tree is remounted
   * (e.g. switching between desktop and mobile layout) the new components retain the view model shortly after the old
   * ones released it, so selection and expansion state survive. The split pane of the desktop layout only renders its
   * content after measuring itself, hence a grace period instead of a single tick.
   */
  public release() {
    this.referenceCounter -= 1
    if (this.referenceCounter <= 0 && !this.pendingDestroy) {
      this.pendingDestroy = setTimeout(() => {
        this.pendingDestroy = undefined
        if (this.referenceCounter <= 0) {
          this.destroy()
        }
      }, TopicViewModel.destroyGracePeriodMs)
    }
  }

  public destroy() {
    if (this.pendingDestroy) {
      clearTimeout(this.pendingDestroy)
      this.pendingDestroy = undefined
    }
    if (this.owner) {
      if (this.owner.viewModel === this) {
        this.owner.viewModel = undefined
      }
      this.owner = undefined
    }
    this.selectionChange.removeAllListeners()
    this.onDecoderChange.removeAllListeners()
    this.expandedChange.removeAllListeners()
  }

  public isSelected() {
    return this.selected
  }

  public isExpanded() {
    return this.expanded
  }

  public setSelected(selected: boolean) {
    this.selected = selected
    this.selectionChange.dispatch()
  }

  public setExpanded(expanded: boolean, fireEvent: boolean) {
    const didChange = this.expanded !== expanded
    this.expanded = expanded
    if (didChange && fireEvent) {
      this.expandedChange.dispatch()
    }
  }
}
