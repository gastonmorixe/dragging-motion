import React from "react";
import ReactDOM from "react-dom";
import faker from "faker";
import random from "lodash/random";
import get from "lodash/get";
import omit from "lodash/omit";
import { withContentRect } from "react-measure";
import {
  branch,
  lifecycle,
  compose,
  withStateHandlers,
  withHandlers,
  mapProps,
  onlyUpdateForKeys
} from "recompose";
import { TransitionMotion, spring } from "react-motion";

import "./styles.css";

const EMPTY_DRAG_IMG = document.createElement("img");
EMPTY_DRAG_IMG.src =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const TASKS_COUNT = 20;

const COLORS = ["#eee", "#ddd"];

const TASKS = new Array(TASKS_COUNT).fill(null).map((t, i) => ({
  id: `task-${i}`,
  content: faker.lorem.lines(random(1, 5))
}));

const View = compose(
  branch(
    p => p.measure,
    compose(
      withContentRect("client"),
      lifecycle({
        componentDidMount() {
          // console.log("bounds 1", this.props.contentRect.client);
        },
        componentDidUpdate(oldProps, oldState) {
          // if(oldProps.)
          const path = "contentRect.client.height";
          let height;
          if (get(oldProps, path) !== (height = get(this.props, path))) {
            if (this.props.onLayout) {
              this.props.onLayout({ height });
            }
            // console.log(`[View] [data-id:${this.props["data-id"]}]`, height);
          }
        }
      })
    )
  )
)(({ onLayout, children, measureRef, contentRect, measure, ...rest }) => (
  <div {...rest} ref={measureRef}>
    {children}
  </div>
));

// onlyUpdateForKeys(["style"])
const Task = compose()(
  ({ isActive, children, index, style, onLayout, ...rest }) => (
    <View
      style={{
        flexDirection: "column",
        display: "flex",
        position: "relative",
        userSelect: "none"
      }}
      {...rest}
    >
      <View
        measure
        onLayout={onLayout}
        data-id={rest["data-id"]}
        style={{
          // top: 0,
          left: 0,
          right: 0,
          transform: `translate3d(0, ${style.top}px, 0)`,
          flexDirection: "column",
          display: "flex",
          position: "absolute",
          transition: "box-shadow linear .3s, background-color linear .3s",
          ...(isActive && {
            zIndex: 1,
            boxShadow: "5px 15px 30px rgba(200,200,200,.6)"
          }),
          backgroundColor: isActive ? "yellow" : COLORS[index % COLORS.length],
          padding: 20
        }}
      >
        {children}
      </View>
    </View>
  )
);

const List = compose()(
  ({
    styles,
    onLayout,
    activeElementId,
    currentDrag,
    onDrag,
    onDragStart,
    onDragEnd,
    data
  }) => {
    return (
      <>
        <View className="App">
          <TransitionMotion styles={styles}>
            {tasks => (
              <>
                {tasks.map((t, i, all) => {
                  // console.log("taks", t);
                  return (
                    <Task
                      onLayout={onLayout(t.data.id)}
                      style={t.style}
                      draggable="true"
                      onDragStart={onDragStart(t.data.id)}
                      onDragEnd={onDragEnd(t.data.id)}
                      onDrag={onDrag(t.data.id)}
                      index={i}
                      data-id={t.data.id}
                      key={t.data.id}
                      isActive={t.data.id === activeElementId}
                    >
                      <>
                        <small style={{ marginBottom: 6 }}>
                          <strong>{t.data.id}</strong>
                        </small>
                        {t.data.content}
                      </>
                    </Task>
                  );
                })}
              </>
            )}
          </TransitionMotion>
        </View>
      </>
    );
  }
);

const INITIAL_DATA = { dy: 0, dragDistance: 0, clientY: 0 };
const ListController = compose(
  withStateHandlers(
    ({
      layout = {},
      data = { ...INITIAL_DATA },
      currentDrag = {},
      activeElementId = null,
      heights = 0
    }) => ({
      layout: {},
      heights: [],
      data,
      activeElementId
    }),
    {
      setLayout: ({}) => layout => {
        return { layout };
      },
      setData: ({}) => value => {
        return {
          data: value
        };
      },
      setActiveElementId: ({ currentDrag }) => value => {
        return {
          activeElementId: value
        };
      }
    }
  ),
  withHandlers({
    onLayout: ({ setLayout, layout, tasks }) => id => ({ height }) => {
      let positions;
      const newLayouts = { ...layout, [id]: { height } };
      if (Object.keys(newLayouts).length >= tasks.length) {
        const tasksOrdered = tasks;
        newLayouts.positions = tasksOrdered.reduce((acc, t, i, all) => {
          const prevElementHeight =
            i >= 1
              ? newLayouts[all[all.findIndex(tt => tt.id === t.id) - 1].id]
                  .height
              : 0;
          // console.log("reduce", i, acc, t, tasks);
          return {
            ...acc,
            sum: i === 0 ? 0 : acc.sum + prevElementHeight,
            [t.id]: (acc.sum || 0) + prevElementHeight
          };
        }, {});
        console.log(
          `[positions] ${id}`,
          newLayouts.positions,
          Object.keys(newLayouts).length
        );
      }
      setLayout(newLayouts);
    },
    onDrag: ({
      data,
      currentDrag,
      setCurrentDrag,
      setActiveElementId
    }) => id => ev => {
      const { clientY } = ev;
      // const el = ev.target;
      // const box = el.getBoundingClientRect();
      const dy = clientY - data.clientY;
      const dragDistance = data.dragDistance + data.dy;
      data.dy = dy;
      data.dragDistance = dragDistance;
      data.clientY = clientY;
      requestAnimationFrame(() => setActiveElementId(id));
    },
    onDragStart: ({ setData, data }) => id => ev => {
      ev.dataTransfer.setDragImage(EMPTY_DRAG_IMG, 0, 0);
      ev.dataTransfer.dropEffect = "none";

      data.dy = 0;
      data.dragDistance = 0;
      data.clientY = ev.clientY;

      setData({ ...data });
    },
    onDragEnd: ({ setActiveElementId, setData }) => id => ev => {
      setData({ ...INITIAL_DATA });
      requestAnimationFrame(() => setActiveElementId(null));
    }
  }),
  mapProps(props => {
    return {
      ...props,
      styles: props.tasks.map(t => {
        let top = t.id !== props.activeElementId ? 0 : props.data.dragDistance;
        const height = get(props, `layout.positions[${t.id}]`);
        if (height) {
          // console.log("top - height", height, props.layout);
          top += height;
        }
        top = spring(top);
        return {
          key: t.id,
          style: {
            top
          },
          data: t
        };
      })
      // heights: calculateHeights()
    };
  })
  // onlyUpdateForKeys(["styles"])
)(List);

const rootElement = document.getElementById("root");
ReactDOM.render(<ListController tasks={TASKS} />, rootElement);
